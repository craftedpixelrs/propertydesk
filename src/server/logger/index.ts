/**
 * Minimal structured logger.
 *
 * All log lines are single-line JSON. In production this ships cleanly to
 * any log aggregator (Papertrail, Datadog, journalctl, ...). In development
 * we also mirror to `console.*` for the friendly IDE display.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  requestId?: string;
  organizationId?: string | null;
  userId?: string | null;
  route?: string;
  action?: string;
  [k: string]: unknown;
}

interface LogRecord extends LogFields {
  level: LogLevel;
  msg: string;
  timestamp: string;
}

const isProd = process.env.NODE_ENV === "production";
const minLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ?? (isProd ? "info" : "debug");

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ error: "unserializable" });
  }
}

function write(level: LogLevel, msg: string, fields?: LogFields): void {
  if (!shouldLog(level)) return;

  const record: LogRecord = {
    level,
    msg,
    timestamp: new Date().toISOString(),
    ...(fields ?? {}),
  };

  const line = safeStringify(record);

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => write("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => write("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => write("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => write("error", msg, fields),

  /** Bind a set of common fields (requestId, org, user) to a child logger. */
  child(bound: LogFields) {
    return {
      debug: (msg: string, fields?: LogFields) => write("debug", msg, { ...bound, ...fields }),
      info: (msg: string, fields?: LogFields) => write("info", msg, { ...bound, ...fields }),
      warn: (msg: string, fields?: LogFields) => write("warn", msg, { ...bound, ...fields }),
      error: (msg: string, fields?: LogFields) => write("error", msg, { ...bound, ...fields }),
    };
  },
};
