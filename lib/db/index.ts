import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import * as schema from "./schema";

const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

const tursoUrl = process.env.TURSO_DATABASE_URL?.trim() || "";

function localDatabaseUrl() {
  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return pathToFileURL(path.join(dataDir, "dashboard.sqlite")).href;
}

const client: Client = tursoUrl
  ? createClient({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
    })
  : createClient({ url: localDatabaseUrl() });

const migrationsFolder = path.join(process.cwd(), "lib/db/migrations");

async function tableExists(name: string) {
  const result = await client.execute({
    sql: `SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`,
    args: [name],
  });
  return result.rows.length > 0;
}

export const db = drizzle(client, { schema });

/** Lightweight liveness probe for `/api/health`. Throws if the database is unreachable. */
export async function checkDatabase() {
  await client.execute("SELECT 1");
}

// `next build` collects page data in parallel workers; migrating a shared file races.
// A remote Turso database is migrated once via `pnpm db:migrate`, not on each instance.
// Local runtime (and tests) still apply migrations on boot.
if (!tursoUrl && !isProductionBuild) {
  await client.execute("PRAGMA foreign_keys = ON");
  await client.execute("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA busy_timeout = 5000");

  if ((await tableExists("user")) && !(await tableExists("__drizzle_migrations"))) {
    const migrations = readMigrationFiles({ migrationsFolder });
    const initial = migrations[0];
    if (initial) {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          hash text NOT NULL,
          created_at numeric
        )
      `);
      await client.execute({
        sql: `INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES (?, ?)`,
        args: [initial.hash, initial.folderMillis],
      });
    }
  }

  await migrate(db, { migrationsFolder });
}
