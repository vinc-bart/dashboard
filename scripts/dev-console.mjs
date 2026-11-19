import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  FOOTER_LINE_COUNT,
  actionForKey,
  browserCommand,
  consumeLocalUrl,
  renderFooter,
} from "./dev-console-ui.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const nextArgs = [nextBin, "dev", ...process.argv.slice(2)];

if (process.stdout.isTTY) runConsole();
else runInherited();

function runInherited() {
  const child = spawn(process.execPath, nextArgs, { cwd: root, stdio: "inherit" });
  child.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });
  child.on("exit", (code) => {
    process.exit(code ?? 1);
  });
}

function runConsole() {
  let restored = false;
  let footerDrawn = false;
  let atLineStart = true;
  let origin = null;
  let carry = "";
  let shuttingDown = false;
  let exitCode = 0;
  const pending = [];
  let scheduled = false;

  function restoreTerminal() {
    if (restored) return;
    restored = true;
    if (!process.stdin.isTTY) return;
    try {
      process.stdin.setRawMode(false);
      process.stdin.pause();
    } catch {
      // stdin may already be closed during process exit
    }
  }

  function hideFooter() {
    if (!footerDrawn) return;
    process.stdout.write(`\x1b[${FOOTER_LINE_COUNT}A\x1b[J`);
    footerDrawn = false;
    atLineStart = true;
  }

  function showFooter() {
    if (!atLineStart) {
      process.stdout.write("\n");
      atLineStart = true;
    }
    process.stdout.write(
      renderFooter({
        origin,
        columns: process.stdout.columns || 80,
        color: process.env.NO_COLOR == null,
      }),
    );
    footerDrawn = true;
  }

  function flush(chunks) {
    hideFooter();
    for (const chunk of chunks) {
      const text = chunk.toString("utf8");
      if (text.length === 0) continue;
      process.stdout.write(chunk);
      atLineStart = text.endsWith("\n");
      if (origin) continue;
      const found = consumeLocalUrl(carry, text);
      carry = found.carry;
      if (found.url) origin = found.url;
    }
    showFooter();
  }

  function enqueue(chunk) {
    pending.push(chunk);
    if (scheduled) return;
    scheduled = true;
    setImmediate(() => {
      scheduled = false;
      const chunks = pending.splice(0, pending.length);
      if (chunks.length > 0) flush(chunks);
    });
  }

  const env = { ...process.env };
  if (env.NO_COLOR == null && env.FORCE_COLOR == null) env.FORCE_COLOR = "1";

  let child;
  try {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    child = spawn(process.execPath, nextArgs, {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    restoreTerminal();
    throw error;
  }

  showFooter();
  child.stdout.on("data", enqueue);
  child.stderr.on("data", enqueue);
  child.on("error", (error) => {
    restoreTerminal();
    console.error(error);
    process.exit(1);
  });
  child.on("exit", (code) => {
    restoreTerminal();
    process.exit(shuttingDown ? exitCode : (code ?? 1));
  });

  function shutdown(code) {
    if (shuttingDown) return;
    shuttingDown = true;
    exitCode = code;
    restoreTerminal();
    if (child.exitCode != null || child.signalCode != null) process.exit(code);
    child.kill("SIGTERM");
    const timer = setTimeout(() => {
      if (child.exitCode == null) child.kill("SIGKILL");
    }, 2000);
    timer.unref();
  }

  process.stdin.on("data", (key) => {
    if (key === "\u0003") {
      shutdown(130);
      return;
    }
    const action = actionForKey(key, origin);
    if (action.type === "quit") shutdown(0);
    else if (action.type === "open") openBrowser(action.url);
  });

  process.stdout.on("resize", () => {
    if (scheduled || !footerDrawn) return;
    hideFooter();
    showFooter();
  });

  for (const signal of ["SIGTERM", "SIGHUP", "SIGINT"]) {
    process.on(signal, () => shutdown(0));
  }
  process.on("exit", restoreTerminal);
}

/**
 * @param {string} url
 */
function openBrowser(url) {
  const { command, args } = browserCommand(process.platform, url);
  const opener = spawn(command, args, { stdio: "ignore", detached: true });
  opener.on("error", () => {});
  opener.unref();
}
