/**
 * Generate a Guardian API key: `zk_live_` + 40 url-safe random chars.
 * Uses the Web Crypto API (available in the browser and Node 19+).
 */
export function generateApiKey(): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(40);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `zk_live_${out}`;
}

/** Mask a key for display: keep the prefix + last 4 chars. */
export function maskKey(key: string): string {
  if (key.length <= 12) return key;
  const visiblePrefix = key.slice(0, 11); // "zk_live_xxx"
  return `${visiblePrefix}${"•".repeat(8)}${key.slice(-4)}`;
}
