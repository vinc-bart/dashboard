const LOCAL_HTTP_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** RFC 6454 origin: scheme, lowercase host, default port omitted, no path. */
export function canonicalAuthOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.origin === "null") return null;
  const localHttp = url.protocol === "http:" && LOCAL_HTTP_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !localHttp) return null;
  return url.origin;
}

function escapeStructuredString(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

/**
 * `OTP-Token` field value from draft-goto-otp-token.
 * Returns null when the origin is not potentially trustworthy.
 */
export function otpTokenHeader(otp: string, authUrl: string | undefined): string | null {
  const origin = canonicalAuthOrigin(authUrl);
  if (!origin) return null;
  const code = otp.replaceAll(/[\r\n\0]/g, "");
  if (!code || /[^\x20-\x7E]/.test(code)) return null;
  return `"${escapeStructuredString(code)}"; origin="${escapeStructuredString(origin)}"`;
}
