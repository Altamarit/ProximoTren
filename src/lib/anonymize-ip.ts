/**
 * anonymizeIP — Privacy by Design (Art. 25 GDPR, NFR-007)
 *
 * Pure, deterministic function with no side effects.
 * Must be the first operation on any raw IP value in the BFF layer.
 * The raw IP MUST NOT be assigned to any variable with broader scope.
 *
 * @param ip Raw IP string (may be a proxy chain "a, b, c" — only first value is processed)
 * @returns Anonymized IP string; always returns a safe value, never throws.
 */
export function anonymizeIP(ip: string): string {
  // Proxy chain: take only the first IP (leftmost = client IP)
  const raw = (ip.split(",")[0] ?? "").trim();

  // ── IPv4 ────────────────────────────────────────────────────────────────────
  // Replace last octet with 0: 192.168.1.42 → 192.168.1.0
  const v4Match = raw.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.)\d{1,3}$/);
  if (v4Match) return `${v4Match[1]}0`;

  // ── IPv6 ────────────────────────────────────────────────────────────────────
  // Expand compressed form (::), keep first 4 groups, zero the last 4.
  if (raw.includes(":")) {
    const groups = expandIPv6Groups(raw);
    if (groups !== null && groups.length === 8) {
      return [...groups.slice(0, 4), "0000", "0000", "0000", "0000"].join(":");
    }
  }

  // ── Fallback ─────────────────────────────────────────────────────────────────
  // Unknown format or exception during parsing → safe neutral value.
  return "0.0.0.0";
}

/**
 * Expands a potentially compressed IPv6 address into exactly 8 groups.
 * Returns null when the input is not a recognisable IPv6 address.
 * @internal
 */
function expandIPv6Groups(ip: string): string[] | null {
  try {
    if (ip.includes("::")) {
      const halves = ip.split("::");
      if (halves.length !== 2) return null;
      const left = halves[0] ? halves[0].split(":") : [];
      const right = halves[1] ? halves[1].split(":") : [];
      const missing = 8 - left.length - right.length;
      if (missing < 0) return null;
      return [...left, ...new Array<string>(missing).fill("0"), ...right];
    }
    const parts = ip.split(":");
    return parts.length === 8 ? parts : null;
  } catch {
    return null;
  }
}
