/**
 * Minimal leveled logger (stdout/stderr).
 * Phase 2: swap internals for pino/winston without touching call sites.
 */

type Level = "debug" | "info" | "warn" | "error";

function stamp(): string {
  return new Date().toISOString();
}

function write(level: Level, args: unknown[]): void {
  const prefix = `[${stamp()}] [${level.toUpperCase()}]`;
  if (level === "error") {
    console.error(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

export const logger = {
  debug: (...args: unknown[]) => write("debug", args),
  info: (...args: unknown[]) => write("info", args),
  warn: (...args: unknown[]) => write("warn", args),
  error: (...args: unknown[]) => write("error", args),
};
