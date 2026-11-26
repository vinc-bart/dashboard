import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { DEV_LOGIN_EMAIL, devLoginRefusal, upsertDevLogin } from "./dev-login.mjs";

const baseEnv = {
  NODE_ENV: "development",
  BETTER_AUTH_URL: "http://localhost:3000",
  DEV_LOGIN_PASSWORD: "local-agent-password",
};

describe("devLoginRefusal", () => {
  it("accepts a local development env", () => {
    expect(devLoginRefusal(baseEnv)).toBeNull();
  });

  it("accepts a missing auth URL", () => {
    const env = { ...baseEnv };
    delete env.BETTER_AUTH_URL;
    expect(devLoginRefusal(env)).toBeNull();
  });

  it("refuses production, Turso, a remote auth URL, and a short password", () => {
    expect(devLoginRefusal({ ...baseEnv, NODE_ENV: "production" })).toMatch(/production/);
    expect(devLoginRefusal({ ...baseEnv, TURSO_DATABASE_URL: "libsql://prod.turso.io" })).toMatch(
      /TURSO/,
    );
    expect(devLoginRefusal({ ...baseEnv, TURSO_DATABASE_URL: "  " })).toBeNull();
    expect(
      devLoginRefusal({ ...baseEnv, BETTER_AUTH_URL: "https://dashboard.vvbb.fr" }),
    ).toMatch(/localhost/);
    expect(devLoginRefusal({ ...baseEnv, DEV_LOGIN_PASSWORD: "short" })).toMatch(/8 to 128/);
    expect(devLoginRefusal({ ...baseEnv, DEV_LOGIN_PASSWORD: "x".repeat(129) })).toMatch(
      /8 to 128/,
    );
  });
});

function openFixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "dev-login-"));
  const db = new Database(path.join(dir, "dashboard.sqlite"));
  db.exec(`
    CREATE TABLE user (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      email text NOT NULL UNIQUE,
      email_verified integer NOT NULL,
      two_factor_enabled integer NOT NULL,
      role text NOT NULL,
      banned integer NOT NULL,
      ban_reason text,
      ban_expires integer,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );
    CREATE TABLE account (
      id text PRIMARY KEY NOT NULL,
      account_id text NOT NULL,
      provider_id text NOT NULL,
      user_id text NOT NULL,
      password text,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );
    CREATE TABLE two_factor (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      secret text NOT NULL,
      backup_codes text NOT NULL,
      verified integer NOT NULL,
      failed_verification_count integer NOT NULL,
      locked_until integer
    );
  `);
  return db;
}

describe("upsertDevLogin", () => {
  const dbs = [];

  afterEach(() => {
    for (const db of dbs.splice(0)) db.close();
  });

  it("creates the agent, then updates the password without a second user", () => {
    const db = openFixture();
    dbs.push(db);
    const created = upsertDevLogin(db, {
      email: DEV_LOGIN_EMAIL,
      name: "Agent",
      passwordHash: "salt:first",
      now: 100,
    });
    expect(created.created).toBe(true);

    db.prepare(
      "UPDATE two_factor SET failed_verification_count = 3, locked_until = 50 WHERE user_id = ?",
    ).run(created.userId);
    db.prepare("UPDATE user SET banned = 1, ban_reason = 'no', email_verified = 0 WHERE id = ?").run(
      created.userId,
    );

    const updated = upsertDevLogin(db, {
      email: DEV_LOGIN_EMAIL,
      name: "Agent",
      passwordHash: "salt:second",
      now: 200,
    });
    expect(updated).toEqual({ userId: created.userId, created: false });
    expect(db.prepare("SELECT count(*) AS n FROM user").get().n).toBe(1);

    const user = db.prepare("SELECT email_verified, two_factor_enabled, banned, ban_reason FROM user").get();
    expect(user).toEqual({
      email_verified: 1,
      two_factor_enabled: 1,
      banned: 0,
      ban_reason: null,
    });
    expect(db.prepare("SELECT password FROM account").get().password).toBe("salt:second");
    expect(
      db.prepare("SELECT failed_verification_count, locked_until FROM two_factor").get(),
    ).toEqual({ failed_verification_count: 0, locked_until: null });
  });
});
