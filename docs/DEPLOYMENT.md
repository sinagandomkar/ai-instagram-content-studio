# Deployment Guide — AI Instagram Content Studio

**Current setup: Postgres (Supabase) + Vercel**, for a permanent public URL that doesn't depend on any one machine being on. V1 originally targeted local-first SQLite (PRD §8); switched to Postgres so the app can run on Vercel, whose serverless functions have no persistent filesystem for a SQLite file. Local dev still works fine without deploying anywhere — see §2.

Three real, non-obvious problems were hit getting this working and are documented here so nobody has to rediscover them:

## 1. Get a Postgres database (Supabase, free tier)

1. Sign up at [supabase.com](https://supabase.com), create a project, set a database password.
2. On the project page, click **Connect** (top of the page) → **Transaction pooler** tab → copy the URI, replace `[YOUR-PASSWORD]`.
3. **Gotcha #1 — IPv6:** Supabase's *direct* connection host (`db.<ref>.supabase.co:5432`) only has an IPv6 (AAAA) DNS record, no IPv4. On a network without IPv6 (common — hit this live, `dig`/`nslookup` confirmed no A record, and the machine had no IPv6 route at all), connecting fails outright with `P1001: Can't reach database server`, credentials and everything else notwithstanding. **Always use the pooler host** (`aws-*.pooler.supabase.com`), which is IPv4.
4. **Gotcha #2 — TLS:** the pooler's certificate isn't in Node's default trusted CA chain. Without `?sslmode=no-verify` on the connection string, every query fails with `P1011: self-signed certificate in certificate chain`. `sslmode=require` alone is *not* enough — it enables TLS but still validates the untrusted chain. Append `?sslmode=no-verify`.
5. **Gotcha #3 — pooler mode for migrations:** Supabase's pooler serves two modes on two ports — **transaction mode** (port `6543`, for the running app — many short-lived connections, exactly what serverless functions need) and **session mode** (port `5432` on the same pooler host, for tools like Prisma's migration engine that need session-level state). Running `prisma migrate dev`/`deploy` against the transaction-mode port can hang or fail unpredictably. **Use the session port (5432) only to run migrations**, then use the transaction port (6543) as `DATABASE_URL` for the actual app.

Net result — two connection strings, same credentials, different port:

```bash
# One-time, to apply migrations:
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-x-xx-xxxx-x.pooler.supabase.com:5432/postgres?sslmode=no-verify" npx prisma migrate deploy

# In .env / Vercel env vars, for the running app:
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-x-xx-xxxx-x.pooler.supabase.com:6543/postgres?sslmode=no-verify"
```

## 2. Local dev

```bash
npm install
cp .env.example .env      # paste your Supabase connection string (§1) + API keys (§3)
npx prisma migrate deploy # first time only — see §1's session-port note
npm run dev
```

Open `http://localhost:3000`. `npm run build` / `npm test` work the same regardless of where the DB lives.

## 3. Deploy to Vercel

1. Push the repo to GitHub if it isn't already.
2. [vercel.com/new](https://vercel.com/new) → import the repo. Framework preset: Next.js (auto-detected).
3. Project Settings → Environment Variables → add the same keys as `.env.example`: `DATABASE_URL` (the **transaction pooler**, port 6543, with `?sslmode=no-verify`), `GEMINI_API_KEY`, `COMPOSIO_API_KEY`, `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID`, `COMPOSIO_USER_ID`.
4. Deploy. Vercel's build runs `prisma generate` (via `postinstall`) but does **not** run migrations — run `prisma migrate deploy` yourself once (§1, session port) before or right after the first deploy, and again after pulling any update that adds a migration.
5. The Composio "connect Instagram account" flow builds its OAuth callback URL from the incoming request's host — on Vercel this resolves correctly out of the box (Vercel sets `x-forwarded-host`/`x-forwarded-proto`, which `lib/request-origin.ts` prefers). This specifically did **not** work when developing behind an SSH tunnel locally (see §4) — the callback tried to redirect to `localhost:3000` instead of the public URL, right after the Instagram OAuth had actually succeeded, until that fallback was added.

## 4. Local + tunnel (alternative to deploying anywhere)

For sharing a local instance without deploying: `npm run dev`, then a tunnel — e.g. `ssh -R 80:localhost:3000 nokey@localhost.run` (no signup) or `cloudflared tunnel --url http://localhost:3000`. Add the tunnel's domain to `allowedDevOrigins` in `next.config.ts` (Next's dev server blocks cross-origin requests by default) and restart `npm run dev`.

**Reality check from actually running this for a while:** free anonymous tunnels (localhost.run, Cloudflare quick tunnels) can be genuinely unstable on some networks — connections dropped repeatedly, sometimes every 1–3 minutes, regardless of keepalive settings, and every reconnect gets a new random URL. A retry loop keeps *something* running, but doesn't fix a link that goes stale between when you generate it and when someone clicks it. This is why Vercel (§3) is the actual recommended path for anything beyond quick local testing, not the tunnel.

## 5. Getting the other API keys (all free-tier)

**Gemini (`GEMINI_API_KEY`):** [Google AI Studio](https://aistudio.google.com/apikey) → create a key. **Gotcha:** `models.list` still shows `gemini-2.5-flash` as available, but `generateContent` on it returns a 404 ("no longer available to new users") for keys created after Google's cutover. Use the `gemini-flash-latest` alias instead (already the default in `src/infrastructure/ai/gemini-provider.ts`) — Google keeps it pointed at their current recommended flash model, avoiding this exact problem recurring.

**Composio (`COMPOSIO_API_KEY`, `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID`):**

1. Sign up at [dashboard.composio.dev](https://dashboard.composio.dev) → Settings → copy the API key.
2. Toolkits → **Instagram** → create an auth config → copy its id into `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID`.
3. `COMPOSIO_USER_ID` can stay `local-user` — V1 is single-user; it's just the identifier Composio uses to scope the connection.
4. **Gotcha:** Composio's `tools.execute()` requires either a pinned toolkit version or `dangerouslySkipVersionCheck: true` — without it, every real Instagram API call throws `TS-SDK::TOOL_VERSION_REQUIRED`. Already set on every call in `composio-provider.ts`.

Without Composio configured, the Main Dashboard, Comment Intelligence for owned content, and Posting Recommendations stay in their "connect your account" empty state — everything else (Viral Content Engine, Reel Actions, Story/Carousel generation) works independently once `GEMINI_API_KEY` is set.

## 6. Docker (self-contained local alternative)

`Dockerfile` + `docker-compose.yml` package the app with Next's `output: "standalone"`. Point `DATABASE_URL` at Supabase (§1) the same way as local dev — no separate DB container needed since Postgres is already hosted.

```bash
docker compose run --rm migrate   # applies migrations (use the session-port URL, §1)
docker compose up app             # runs with the transaction-port URL
```

## 7. Troubleshooting

- **`P1001: Can't reach database server`:** using the direct connection host instead of the pooler (§1 gotcha #1).
- **`P1011: self-signed certificate in certificate chain`:** missing `?sslmode=no-verify` (§1 gotcha #2).
- **`prisma migrate dev`/`deploy` hangs or fails against a Supabase pooler URL:** you're on the transaction-mode port (6543); switch to session mode (5432) just for the migration command (§1 gotcha #3).
- **`TS-SDK::TOOL_VERSION_REQUIRED` from a Composio call:** `dangerouslySkipVersionCheck: true` missing from that `tools.execute()` call.
- **Gemini call fails with 404 "no longer available to new users":** you're on a deprecated pinned model name; use `gemini-flash-latest`.
- **Dashboard loads the page shell but data never arrives, no error shown:** cross-origin block from Next's dev server (§4) — check `allowedDevOrigins` in `next.config.ts` and that you restarted `npm run dev` after changing it. Not applicable on Vercel.
- **Composio "connect account" redirects to `localhost:3000` and fails with `ERR_SSL_PROTOCOL_ERROR`, right after OAuth visibly succeeded:** the callback URL was built from the wrong origin (fixed via `lib/request-origin.ts`, which prefers `x-forwarded-host`/`-proto`) — if you still hit this, check those headers are actually being forwarded by whatever's in front of the app (a tunnel or proxy that doesn't set them will reproduce this).
