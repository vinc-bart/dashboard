/**
 * Local-only login for the editor browser.
 * Upserts agent@localhost in the SQLite file. The sign-in code still comes
 * from the dev server log (`[dev] Sign-in code for …`). Never run this
 * against Turso or production.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "better-auth/crypto";
import Database from "better-sqlite3";

export const DEV_LOGIN_EMAIL = "agent@localhost";
const DEV_LOGIN_NAME = "Agent";
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export function devLoginRefusal(env) {
  if (env.NODE_ENV === "production") {
    return "Refusing to create a dev login while NODE_ENV=production.";
  }
  if ((env.TURSO_DATABASE_URL ?? "").trim()) {
    return "Refusing to create a dev login while TURSO_DATABASE_URL is set. Use the local SQLite file.";
  }
  const authUrl = (env.BETTER_AUTH_URL ?? "").trim();
  if (authUrl && !isLocalAuthUrl(authUrl)) {
    return "Refusing to create a dev login unless BETTER_AUTH_URL is localhost.";
  }
  const password = env.DEV_LOGIN_PASSWORD ?? "";
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return "DEV_LOGIN_PASSWORD must be 8 to 128 characters. Set it in .env.local and do not commit it.";
  }
  return null;
}

function isLocalAuthUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function upsertDevLogin(db, { email, name, passwordHash, now }) {
  const apply = db.transaction((row) => {
    const existing = db.prepare("SELECT id FROM user WHERE email = ?").get(row.email);
    const userId = existing?.id ?? randomUUID();
    if (!existing) {
      db.prepare(
        `INSERT INTO user (
           id, name, email, email_verified, two_factor_enabled, role, banned,
           created_at, updated_at
         ) VALUES (?, ?, ?, 1, 1, 'user', 0, ?, ?)`,
      ).run(userId, row.name, row.email, row.now, row.now);
    } else {
      db.prepare(
        `UPDATE user
         SET email_verified = 1,
             two_factor_enabled = 1,
             banned = 0,
             ban_reason = NULL,
             ban_expires = NULL,
             updated_at = ?
         WHERE id = ?`,
      ).run(row.now, userId);
    }

    const account = db
      .prepare("SELECT id FROM account WHERE user_id = ? AND provider_id = 'credential'")
      .get(userId);
    if (!account) {
      db.prepare(
        `INSERT INTO account (
           id, account_id, provider_id, user_id, password, created_at, updated_at
         ) VALUES (?, ?, 'credential', ?, ?, ?, ?)`,
      ).run(randomUUID(), userId, userId, row.passwordHash, row.now, row.now);
    } else {
      db.prepare("UPDATE account SET password = ?, updated_at = ? WHERE id = ?").run(
        row.passwordHash,
        row.now,
        account.id,
      );
    }

    const factor = db.prepare("SELECT id FROM two_factor WHERE user_id = ?").get(userId);
    if (!factor) {
      db.prepare(
        `INSERT INTO two_factor (
           id, user_id, secret, backup_codes, verified, failed_verification_count
         ) VALUES (?, ?, '', '[]', 0, 0)`,
      ).run(randomUUID(), userId);
    } else {
      db.prepare(
        "UPDATE two_factor SET failed_verification_count = 0, locked_until = NULL WHERE id = ?",
      ).run(factor.id);
    }

    return { userId, created: !existing };
  });
  return apply({ email, name, passwordHash, now });
}

function sqlitePath(env) {
  const dataDir = env.DATA_DIR?.trim() || "./data";
  return path.join(path.resolve(dataDir), "dashboard.sqlite");
}

async function main() {
  const reason = devLoginRefusal(process.env);
  if (reason) {
    console.error(reason);
    process.exit(1);
  }
  const dbPath = sqlitePath(process.env);
  if (!fs.existsSync(dbPath)) {
    console.error(`SQLite file not found: ${dbPath}`);
    process.exit(1);
  }
  const passwordHash = await hashPassword(process.env.DEV_LOGIN_PASSWORD);
  const db = new Database(dbPath);
  try {
    const result = upsertDevLogin(db, {
      email: DEV_LOGIN_EMAIL,
      name: DEV_LOGIN_NAME,
      passwordHash,
      now: Math.floor(Date.now() / 1000),
    });
    const verb = result.created ? "Created" : "Updated";
    console.info(`${verb} ${DEV_LOGIN_EMAIL} in ${dbPath}`);
    console.info(
      "Sign in at /fr/login. In development the code is printed as [dev] Sign-in code for " +
        `${DEV_LOGIN_EMAIL}: …`,
    );
  } finally {
    db.close();
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);
if (isDirectRun) {
  await main();
}
