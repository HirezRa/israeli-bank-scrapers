import { REDACTED, redactSensitiveString } from './redaction';

const MAX_PUBLIC_MESSAGE_LENGTH = 500;
const MAX_CAUSE_DEPTH = 4;

/**
 * Strip query string, fragment, and any `user:pass@` from URLs for logs and thrown errors.
 * Returns `origin + pathname` (e.g. `https://bank.example/api/foo`).
 */
export function sanitizeUrlForLogs(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return '[invalid-url]';
  }
}

/** @deprecated Use sanitizeUrlForLogs — identical behavior. */
export const safeUrlForError = sanitizeUrlForLogs;

/**
 * GraphQL / institute error strings may echo variables; keep a short sanitized snippet only.
 */
export function sanitizeExternalServiceMessage(message: unknown): string {
  if (message === null || message === undefined) {
    return 'request failed';
  }
  const s = redactSensitiveString(String(message)).trim();
  if (!s) {
    return 'request failed';
  }
  if (s.length > MAX_PUBLIC_MESSAGE_LENGTH) {
    return `${s.slice(0, MAX_PUBLIC_MESSAGE_LENGTH)}…`;
  }
  return s;
}

function appendSanitizedCause(base: string, causeMsg: string): string {
  const combined = `${base} [cause: ${causeMsg}]`;
  return sanitizeExternalServiceMessage(combined);
}

/**
 * User-facing / API-facing message from an unknown throw — never includes raw stacks or bodies.
 * Unwraps `Error.cause` up to a small depth when present.
 */
export function publicErrorMessageFromUnknown(
  err: unknown,
  fallback = 'An unexpected error occurred',
  depth = 0,
): string {
  if (depth > MAX_CAUSE_DEPTH) {
    return fallback;
  }
  if (err instanceof Error) {
    const base = err.message ? sanitizeExternalServiceMessage(err.message) : '';
    const withCause = err as Error & { cause?: unknown };
    if (withCause.cause !== undefined && withCause.cause !== null) {
      const c = publicErrorMessageFromUnknown(withCause.cause, '', depth + 1);
      if (c) {
        const merged = base ? appendSanitizedCause(base, c) : c;
        return merged || fallback;
      }
    }
    return base || fallback;
  }
  if (typeof err === 'string') {
    return sanitizeExternalServiceMessage(err);
  }
  return fallback;
}

/**
 * Build a safe parse / network error for in-page fetch helpers (no raw response body).
 */
export function createSafeInPageFetchError(
  operation: string,
  url: string,
  kind: 'network' | 'parse',
  status?: number,
): Error {
  const where = sanitizeUrlForLogs(url);
  const statusPart = status !== undefined ? ` status=${status}` : '';
  return new Error(`${operation} ${kind} error for ${where}${statusPart} (${REDACTED})`);
}
