// Structured logger — satisfies Non-Negotiable #4 (observability: logs from day one).
// In production, replace this with an OpenTelemetry log exporter.

interface LogEntry {
  level: "error" | "warn" | "info";
  message: string;
  context?: Record<string, unknown>;
}

function emit(entry: LogEntry): void {
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  error: (message: string, context?: Record<string, unknown>) =>
    emit({ level: "error", message, context }),
  warn: (message: string, context?: Record<string, unknown>) =>
    emit({ level: "warn", message, context }),
  info: (message: string, context?: Record<string, unknown>) =>
    emit({ level: "info", message, context }),
} as const;
