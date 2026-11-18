import { execFileSync } from "node:child_process";
import fs from "node:fs";

if (!fs.existsSync(".next/standalone")) {
  console.log("postbuild: no standalone output, skipping");
  process.exit(0);
}

fs.cpSync("public", ".next/standalone/public", { recursive: true });
fs.cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
execFileSync(process.execPath, ["scripts/copy-newrelic-standalone.mjs"], {
  stdio: "inherit",
});
