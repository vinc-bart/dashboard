/** @typedef {{ key: "p" | "l" | "d", label: string, url: string }} DevLink */
/** @typedef {{ type: "quit" } | { type: "ignore" } | { type: "open", url: string }} KeyAction */

export const FOOTER_LINE_COUNT = 3;

const CARRY_LIMIT = 200;
const LOCAL_URL = /Local:\s+(https?:\/\/[^\s]+)/;
const ESC = String.fromCharCode(0x1b);
const BEL = String.fromCharCode(0x07);

/**
 * @param {string} text
 */
export function stripAnsi(text) {
  const osc = new RegExp(`${ESC}\\][^${BEL}]*(?:${BEL}|${ESC}\\\\)`, "g");
  const csi = new RegExp(`${ESC}\\[[0-9;?]*[ -/]*[@-~]`, "g");
  return text.replace(osc, "").replace(csi, "");
}

/**
 * Keep a raw tail so a Local URL split across Next chunks still matches.
 * @param {string} carry
 * @param {string} chunk
 * @returns {{ url: string | null, carry: string }}
 */
export function consumeLocalUrl(carry, chunk) {
  const raw = carry + chunk;
  const match = LOCAL_URL.exec(stripAnsi(raw));
  if (match) return { url: match[1], carry: "" };
  return { url: null, carry: raw.slice(-CARRY_LIMIT) };
}

/**
 * @param {string} origin
 * @returns {DevLink[]}
 */
export function linksFor(origin) {
  const base = trimTrailingSlashes(origin);
  return [
    { key: "p", label: "preview", url: `${base}/fr` },
    { key: "l", label: "login", url: `${base}/fr/login` },
    { key: "d", label: "dashboard", url: `${base}/fr/dashboard` },
  ];
}

/**
 * @param {string} url
 * @param {string} label
 */
export function hyperlink(url, label) {
  return `${ESC}]8;;${url}${BEL}${label}${ESC}]8;;${BEL}`;
}

/**
 * @param {string} value
 */
function trimTrailingSlashes(value) {
  let end = value.length;
  while (end > 0 && value.endsWith("/", end)) {
    end -= 1;
  }
  return value.slice(0, end);
}

/**
 * @param {string | null} origin
 * @param {number} columns
 * @param {boolean} color
 */
export function renderFooter({ origin, columns, color }) {
  const width = Math.max(columns || 80, 20);
  const links = origin ? linksFor(origin) : null;
  const line1 = ruleLine(width, color);
  const line2 = links ? linkify(fit(`p  preview     ${links[0].url}`, width), links) : fit("starting", width);
  const line3 = links ? linkify(shortcutLine(links, width), links) : fit(shortcutKeys(), width);
  return `${line1}\n${line2}\n${line3}\n`;
}

/**
 * @param {string} key
 * @param {string | null} origin
 * @returns {KeyAction}
 */
export function actionForKey(key, origin) {
  if (key === "\u0003" || key === "q") return { type: "quit" };
  if (key !== "p" && key !== "l" && key !== "d") return { type: "ignore" };
  if (!origin) return { type: "ignore" };
  const link = linksFor(origin).find((item) => item.key === key);
  if (!link) return { type: "ignore" };
  return { type: "open", url: link.url };
}

/**
 * pnpm keeps the `--` separator in argv (`pnpm dev -- --port 4000`).
 * Next treats everything after that `--` as a project directory.
 * @param {string} bin
 * @param {string[]} userArgs
 */
export function nextCliArgs(bin, userArgs) {
  const args = userArgs[0] === "--" ? userArgs.slice(1) : userArgs;
  return [bin, "dev", ...args];
}

/**
 * @param {string} platform
 * @param {string} url
 */
export function browserCommand(platform, url) {
  if (platform === "darwin") return { command: "open", args: [url] };
  if (platform === "win32") return { command: "cmd", args: ["/c", "start", "", url] };
  return { command: "xdg-open", args: [url] };
}

/**
 * @param {number} columns
 * @param {boolean} color
 */
function ruleLine(columns, color) {
  const width = visibleWidth(columns);
  const body = (`━━ Paris Ouverte ${"━".repeat(width)}`).slice(0, width);
  if (!color) return body;
  return `\u001b[31m${body}\u001b[0m`;
}

function shortcutKeys() {
  return "p  preview    l  login    d  dashboard    q  quit";
}

/**
 * @param {DevLink[]} links
 * @param {number} columns
 */
function shortcutLine(links, columns) {
  const login = links[1];
  const dashboard = links[2];
  const withDashboard = `l  login       ${login.url}    d  dashboard    ${dashboard.url}    q  quit`;
  const compact = `l  login       ${login.url}    d  dashboard    q  quit`;
  const width = visibleWidth(columns);
  if (withDashboard.length <= width) return withDashboard;
  if (compact.length <= width) return compact;
  return fit(shortcutKeys(), columns);
}

/**
 * @param {string} text
 * @param {number} columns
 */
function fit(text, columns) {
  const width = visibleWidth(columns);
  if (text.length <= width) return text;
  if (width === 1) return "…";
  return `${text.slice(0, width - 1)}…`;
}

/**
 * @param {number} columns
 */
function visibleWidth(columns) {
  return Math.max(1, columns - 1);
}

/**
 * @param {string} line
 * @param {DevLink[]} links
 */
function linkify(line, links) {
  const urls = links.map((link) => link.url).sort((a, b) => b.length - a.length);
  let result = "";
  let index = 0;
  while (index < line.length) {
    const url = urls.find((candidate) => line.startsWith(candidate, index));
    if (url) {
      result += hyperlink(url, url);
      index += url.length;
      continue;
    }
    result += line[index];
    index += 1;
  }
  return result;
}
