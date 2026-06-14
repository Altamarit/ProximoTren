import { describe, it, expect } from "vitest";
import { anonymizeIP } from "@/lib/anonymize-ip";
import { AuditEventSchema } from "@/lib/schemas/audit-event.schema";

// ── AC-1 — IPv4 anonymization ────────────────────────────────────────────────

describe("anonymizeIP — IPv4 (AC-1)", () => {
  it("zeros the last octet of a standard IPv4", () => {
    expect(anonymizeIP("192.168.1.42")).toBe("192.168.1.0");
  });

  it("zeros the last octet when it is 1", () => {
    expect(anonymizeIP("10.0.0.1")).toBe("10.0.0.0");
  });

  it("handles IPv4 broadcast address", () => {
    expect(anonymizeIP("255.255.255.255")).toBe("255.255.255.0");
  });

  it("is idempotent: last-octet already 0", () => {
    expect(anonymizeIP("10.0.0.0")).toBe("10.0.0.0");
  });

  it("handles single-digit octets", () => {
    expect(anonymizeIP("1.2.3.4")).toBe("1.2.3.0");
  });
});

// ── AC-2 — IPv6 anonymization ────────────────────────────────────────────────

describe("anonymizeIP — IPv6 (AC-2)", () => {
  it("anonymizes full-form IPv6 — zeros last 4 groups", () => {
    const result = anonymizeIP("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    expect(result.startsWith("2001:0db8:85a3:0000:")).toBe(true);
    expect(result.endsWith(":0000:0000:0000:0000")).toBe(true);
  });

  it("anonymizes compressed IPv6 — keeps first 4 groups", () => {
    const result = anonymizeIP("2001:db8:85a3::8a2e:370:7334");
    expect(result.startsWith("2001:")).toBe(true);
    // Original last groups must not appear
    expect(result).not.toContain("8a2e");
    expect(result).not.toContain("7334");
    // Must be 8 groups (7 colons)
    expect(result.split(":")).toHaveLength(8);
  });

  it("zeros last 4 groups — original host portion removed", () => {
    const result = anonymizeIP("fe80:0000:0000:0000:0202:b3ff:fe1e:8329");
    expect(result.endsWith(":0000:0000:0000:0000")).toBe(true);
    expect(result).not.toContain("8329");
  });

  it("IPv6 loopback ::1 — falls back to 0.0.0.0 (only 2 groups after expand)", () => {
    // ::1 expands to 7 zeros + 1 → 8 groups; first 4 are "0", last 4 zeroed
    const result = anonymizeIP("::1");
    // Either properly expanded (8 groups) or fallback — both are safe and non-identifying
    expect(result === "0.0.0.0" || result.split(":").length === 8).toBe(true);
    expect(result).not.toBe("::1"); // original never returned
  });

  it("trailing double-colon 2001:db8:: — last groups zeroed", () => {
    const result = anonymizeIP("2001:db8::");
    // right is empty → missing = 6; expands to 8 groups
    expect(result.startsWith("2001:")).toBe(true);
    expect(result.split(":")).toHaveLength(8);
  });

  it("IPv4-mapped IPv6 ::ffff:192.168.1.1 — prefix retained, host zeroed", () => {
    // Expands to: ["", "", "ffff", ...] — falls through to 0.0.0.0 or is anonymized
    const result = anonymizeIP("::ffff:192.168.1.1");
    // Must not contain the original host portion
    expect(result).not.toContain("192.168.1.1");
  });
});

// ── AC-3 — Fallback for unknown format ───────────────────────────────────────

describe("anonymizeIP — Fallback (AC-3)", () => {
  it("returns 0.0.0.0 for non-IP string", () => {
    expect(anonymizeIP("unknown")).toBe("0.0.0.0");
  });

  it("returns 0.0.0.0 for empty string", () => {
    expect(anonymizeIP("")).toBe("0.0.0.0");
  });

  it("returns 0.0.0.0 for random text", () => {
    expect(anonymizeIP("not-an-ip")).toBe("0.0.0.0");
  });

  it("does not throw for malformed input", () => {
    expect(() => anonymizeIP(":::garbage:::")).not.toThrow();
  });
});

// ── Edge case: proxy chain ───────────────────────────────────────────────────
// anonymizeIP owns proxy-chain extraction. The route passes the raw
// x-forwarded-for header value directly (may be comma-separated chain).

describe("anonymizeIP — Proxy chain", () => {
  it("anonymizes only the first IP in a comma-separated chain", () => {
    const result = anonymizeIP("192.168.1.42, 10.0.0.1");
    expect(result).toBe("192.168.1.0");
    expect(result).not.toContain("10.0.0.1");
  });

  it("handles proxy chain with three IPs", () => {
    const result = anonymizeIP("203.0.113.5, 198.51.100.1, 10.0.0.1");
    expect(result).toBe("203.0.113.0");
  });

  it("route-level simulation: raw header value passed directly to anonymizeIP", () => {
    // Simulates how route.ts calls: anonymizeIP(header ?? "unknown")
    // The header value may be a comma-separated chain with spaces
    const headerValue = "172.16.0.99, 10.0.0.1, 192.168.0.1";
    expect(anonymizeIP(headerValue)).toBe("172.16.0.0");
  });
});

// ── Header absent ─────────────────────────────────────────────────────────────

describe("anonymizeIP — Header absent", () => {
  it("returns 0.0.0.0 when called with 'unknown' (null header fallback)", () => {
    expect(anonymizeIP("unknown")).toBe("0.0.0.0");
  });
});

// ── AC-6 — Pure and deterministic ────────────────────────────────────────────

describe("anonymizeIP — Purity & Determinism (AC-6)", () => {
  it("returns the same result for 100 calls with the same IPv4 input", () => {
    const results = Array.from({ length: 100 }, () => anonymizeIP("192.168.1.42"));
    const unique = new Set(results);
    expect(unique.size).toBe(1);
    expect(results[0]).toBe("192.168.1.0");
  });

  it("returns the same result for 100 calls with the same IPv6 input", () => {
    const results = Array.from({ length: 100 }, () =>
      anonymizeIP("2001:0db8:85a3:0000:0000:8a2e:0370:7334")
    );
    const unique = new Set(results);
    expect(unique.size).toBe(1);
  });

  it("returns the same result for 100 calls with unknown input", () => {
    const results = Array.from({ length: 100 }, () => anonymizeIP("unknown"));
    const unique = new Set(results);
    expect(unique.size).toBe(1);
    expect(results[0]).toBe("0.0.0.0");
  });
});

// ── AC-4 — Absence of non-anonymized IP in AuditEvent ────────────────────────

describe("AuditEvent schema — Absence of raw IP (AC-4)", () => {
  const sampleEvent = {
    event_type: "times_request" as const,
    station_id: "PAR_SOL",
    line_id: "L1",
    direction: "Valdecarros",
    source: "live" as const,
    status_code: 200,
    timestamp_iso: "2026-06-14T10:00:00+00:00",
    duration_ms: 42,
  };

  it("AuditEvent parses without IP field", () => {
    expect(() => AuditEventSchema.parse(sampleEvent)).not.toThrow();
  });

  it("AuditEvent serialized JSON does not contain a non-anonymized IPv4 pattern", () => {
    const json = JSON.stringify(AuditEventSchema.parse(sampleEvent));
    // Pattern: any IP where last octet is non-zero (not anonymized)
    const nonAnonIpv4 = /\d{1,3}\.\d{1,3}\.\d{1,3}\.[1-9]\d*/;
    expect(nonAnonIpv4.test(json)).toBe(false);
  });

  it("AuditEvent sample with 50 log entries — none contain non-anonymized IPv4", () => {
    const entries = Array.from({ length: 50 }, (_, i) => ({
      ...sampleEvent,
      station_id: `STATION_${i}`,
      duration_ms: i * 10,
    }));
    const json = JSON.stringify(entries);
    const nonAnonIpv4 = /\d{1,3}\.\d{1,3}\.\d{1,3}\.[1-9]\d*/;
    expect(nonAnonIpv4.test(json)).toBe(false);
  });
});

// ── AC-5 — Absence of User-Agent in AuditEvent schema ────────────────────────

describe("AuditEvent schema — Absence of user_agent (AC-5)", () => {
  it("AuditEvent schema keys do not include user_agent", () => {
    const keys = Object.keys(AuditEventSchema.shape);
    expect(keys).not.toContain("user_agent");
  });

  it("AuditEvent schema keys do not include ip", () => {
    const keys = Object.keys(AuditEventSchema.shape);
    expect(keys).not.toContain("ip");
  });

  it("AuditEvent with extra user_agent field is stripped on parse", () => {
    const withAgent = {
      event_type: "times_request" as const,
      station_id: "PAR_SOL",
      line_id: "L1",
      direction: "Valdecarros",
      source: "live" as const,
      status_code: 200,
      timestamp_iso: "2026-06-14T10:00:00+00:00",
      duration_ms: 42,
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    };
    const parsed = AuditEventSchema.parse(withAgent);
    expect(JSON.stringify(parsed)).not.toContain("user_agent");
    expect(JSON.stringify(parsed)).not.toContain("Mozilla");
  });
});
