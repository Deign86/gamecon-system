/**
 * logger.js — Production-safe logging wrapper.
 *
 * In development (NODE_ENV !== "production"), logs pass through normally.
 * In production, all logs are silenced to keep the console clean and
 * prevent accidental leakage of sensitive data.
 *
 * Usage:
 *   import { log, warn, error, info } from "@/lib/logger";
 *   log("Debug message", someData);
 *   error("Something failed:", err);
 */

const isDev = import.meta.env.DEV; // Vite sets this to `true` in dev mode

/** General debug logging — stripped in production */
export const log = (...args) => {
  if (isDev) console.log(...args);
};

/** Warning logging — stripped in production */
export const warn = (...args) => {
  if (isDev) console.warn(...args);
};

/** Error logging — stripped in production */
export const error = (...args) => {
  if (isDev) console.error(...args);
};

/** Info logging — stripped in production */
export const info = (...args) => {
  if (isDev) console.info(...args);
};
