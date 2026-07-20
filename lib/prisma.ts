import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// SQLITE_DB_PATH (absolute path) wins when set — required in Docker/standalone
// output, where Next bundles this file into a build chunk under `.next/server/`,
// so resolving "relative to this file" would resolve relative to the bundle, not
// the source tree (see docs/DEPLOYMENT.md §5). Falls back to resolving relative to
// this file for local `npm run dev`, which reliably lands on project-root/dev.db —
// the same file the Prisma CLI creates from DATABASE_URL="file:./dev.db" in .env
// (prisma.config.ts resolves that relative to cwd, i.e. the project root too).
// A plain relative "file:./dev.db" here was rejected because it depends on
// process.cwd() at the moment this module happens to load, which isn't stable
// across dev server workers, the build tracer, and `next start`.
const dbPath =
  process.env.SQLITE_DB_PATH ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
