import "server-only";

type LogMeta = Record<string, unknown>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

export const logger = {
  info(message: string, meta?: LogMeta) {
    console.info(JSON.stringify({ level: "info", message, ...meta }));
  },
  warn(message: string, meta?: LogMeta) {
    console.warn(JSON.stringify({ level: "warn", message, ...meta }));
  },
  error(message: string, error?: unknown, meta?: LogMeta) {
    console.error(JSON.stringify({ level: "error", message, error: error ? serializeError(error) : undefined, ...meta }));
  },
};
