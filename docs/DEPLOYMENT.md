# Deployment Guide — AI Instagram Content Studio

**Current setup: local-first (PRD §8).** SQLite, runs entirely on your own machine — no cloud account required to develop or to demo it to others. A Vercel+Postgres path exists too (§4) for a permanent, always-on public URL, but it needs a real Postgres host (Vercel's serverless filesystem can't keep a SQLite file), which is more setup than a first run needs.

## 1. Local dev

```bash
npm install
cp .env.example .env      # fill in GEMINI_API_KEY / COMPOSIO_* — see §3. App boots fine with them empty.
npx prisma migrate deploy # creates dev.db and applies the schema
npm run dev
```

Open `http://localhost:3000`.

Run the test suite: `npm test`. Type-check/build: `npx next build`.

## 2. Sharing your local instance with other people

Your laptop stays the server — this exposes `localhost:3000` through a tunnel so anyone with the link can reach it, for as long as your machine and the tunnel process are both running. Two options, pick one:

**localhost.run (SSH-based, no signup, used for this build's demo):**

```bash
ssh -R 80:localhost:3000 nokey@localhost.run
```

Prints a public `https://<random>.lhr.life` URL. Plain SSH tends to get through restrictive/unstable networks better than QUIC-based tunnels (see the cloudflared note below).

**Cloudflare quick tunnel (also no signup):**

```bash
cloudflared tunnel --url http://localhost:3000
```

Prints a public `https://<random>.trycloudflare.com` URL. This defaults to QUIC (UDP) for its control connection; on a network that drops/throttles UDP, it can fail to register or drop mid-session — if that happens, retry with `cloudflared tunnel --url http://localhost:3000 --protocol http2` (forces TCP) or just use the localhost.run option instead.

**Either way, one config change is required:** Next's dev server blocks cross-origin requests by default (a security default, not a bug). `next.config.ts` already whitelists both tunnel domains via `allowedDevOrigins: ["*.trycloudflare.com", "*.lhr.life"]` — if you use a different tunnel provider, add its domain there too and restart `npm run dev` (this specific config only takes effect on restart, unlike most Next config).

**Tradeoffs worth knowing before you rely on this:**

- The URL changes every time the tunnel restarts (both providers, no free way around it without an account).
- Nothing is reachable once your laptop sleeps, loses network, or the terminal running the tunnel closes.
- This is fine for demos and testing; it is not what you'd point real users at long-term — for that, see §4.

## 3. Getting API keys (all free-tier)

**Gemini (`GEMINI_API_KEY`):** [Google AI Studio](https://aistudio.google.com/apikey) → create a key. Free tier covers V1's usage (PRD §8).

**Composio (`COMPOSIO_API_KEY`, `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID`):**

1. Sign up at [dashboard.composio.dev](https://dashboard.composio.dev) → Settings → copy the API key.
2. Toolkits → find **Instagram** → create an auth config (this is what authorizes *your* app to request Instagram Business/Creator account access via Composio's OAuth flow) → copy its id into `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID`.
3. `COMPOSIO_USER_ID` can stay `local-user` — V1 is single-user (PRD §8); this is just the identifier Composio uses to scope the connection.

Without these two, the Main Dashboard (PRD §6.1), Comment Intelligence for owned content, and Posting Recommendations stay in their "connect your account" empty state — everything else (Viral Content Engine, Reel Actions, Story/Carousel generation) works independently once `GEMINI_API_KEY` is set.

## 4. A permanent, always-on deployment (optional, more setup)

For a real public URL that doesn't depend on your laptop being on: Vercel (free tier) + a hosted Postgres (Supabase free tier), since Vercel's serverless functions have no persistent filesystem for SQLite.

This is a real code change, not just config — swap `prisma/schema.prisma`'s `datasource db { provider = "sqlite" }` to `"postgresql"`, swap `@prisma/adapter-better-sqlite3` for `@prisma/adapter-pg` in `lib/prisma.ts` (constructor takes the connection string directly: `new PrismaPg(connectionString)`, not `{ connectionString }`), point `DATABASE_URL` at Supabase, and re-run `prisma migrate dev` against it to generate fresh Postgres migrations (SQLite and Postgres migration SQL aren't interchangeable — delete `prisma/migrations/` first).

**Known gotcha hit while building this:** Supabase's *direct* connection host (`db.<ref>.supabase.co:5432`) only has an IPv6 (AAAA) DNS record — no IPv4/A record. On a network without IPv6 (common on plenty of home/mobile connections), that connection will fail outright with `P1001: Can't reach database server`, even though the credentials and everything else are correct. Use the **connection pooler** string instead (Supabase dashboard → Connect → "Transaction pooler" or "Session pooler" tab), which is IPv4-compatible — port `6543` for the transaction pooler, which is also what Vercel's serverless functions should use anyway (short-lived connections per request).

Once the DB is switched: push to GitHub, import the repo at [vercel.com/new](https://vercel.com/new), add the same env vars as `.env.example` (with the Postgres `DATABASE_URL`) in Project Settings, deploy, then run `npx prisma migrate deploy` once yourself against that `DATABASE_URL` (Vercel's build doesn't run migrations automatically).

Research-mode discovery (`BrowserAutomationProvider`) won't work on Vercel regardless — it spawns a local `npx @playwright/mcp` child process, which serverless functions can't sustain. Leave it off in a hosted deployment.

## 5. Docker (self-contained local alternative)

`Dockerfile` + `docker-compose.yml` package the app with `output: "standalone"` for a small image, using the same local SQLite setup as §1 — useful if you'd rather not have Node/npm on the host at all.

```bash
docker compose run --rm migrate   # applies migrations to a named volume
docker compose up app
```

`migrate` runs against the `builder` build stage (full `node_modules`, including the `prisma` CLI — a devDependency, so it's deliberately not in the slim runner image). Re-run it after pulling any update that adds a migration.

## 6. Troubleshooting

- **"table does not exist" errors:** migrations haven't been applied to the DB file the app is actually reading. `lib/prisma.ts` resolves the SQLite path relative to itself (not `process.cwd()`) specifically because a plain relative path caused exactly this — two different processes silently opening two different empty database files. See the comment there before changing how the path is resolved.
- **`GEMINI_API_KEY is not configured` / `Composio is not configured`:** expected, not a bug — set the corresponding env var (§3). The app is designed to fail loudly here rather than silently returning fake data.
- **Dashboard loads the page shell but data never arrives, no error shown:** almost always the cross-origin block from §2 — check `allowedDevOrigins` in `next.config.ts` includes your tunnel's domain, and that you restarted `npm run dev` after changing it.
