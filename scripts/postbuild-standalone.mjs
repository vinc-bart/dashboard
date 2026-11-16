import { execSync } from "node:child_process";
import fs from "node:fs";

if (!fs.existsSync(".next/standalone")) {
  console.log("postbuild: no standalone output, skipping");
  process.exit(0);
}

execSync("cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/", {
  stdio: "inherit",
});
execSync("node scripts/copy-newrelic-standalone.mjs", { stdio: "inherit" });
