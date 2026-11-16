import { defineConfig } from "drizzle-kit";

const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();

const schema = "./lib/db/schema.ts";
const out = "./lib/db/migrations";

export default defineConfig(
  tursoUrl
    ? {
        dialect: "turso",
        schema,
        out,
        dbCredentials: {
          url: tursoUrl,
          authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
        },
      }
    : {
        dialect: "sqlite",
        schema,
        out,
        dbCredentials: {
          url: process.env.DATA_DIR
            ? `${process.env.DATA_DIR.replace(/\/$/, "")}/dashboard.sqlite`
            : "./data/dashboard.sqlite",
        },
      },
);
