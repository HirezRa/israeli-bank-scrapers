/**
 * Centralized redaction for logs, errors, and structured metadata.
 * Avoid logging or stringifying credentials, tokens, or financial identifiers.
 */

export const REDACTED = '[REDACTED]';

const JWT_LIKE = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;

const BEARER = /\bBearer\s+[^\s]+\b/gi;

/** Keys that always redact their values (case-insensitive match on key). */
const SENSITIVE_KEY_EXACT = new Set(
  [
    'password',
    'pass',
    'pwd',
    'pin',
    'pincode',
    'otp',
    'otpcode',
    'otpcontext',
    'otpsmstoken',
    'otplongtermtoken',
    'token',
    'accesstoken',
    'refreshtoken',
    'idtoken',
    'devicetoken',
    'authorization',
    'cookie',
    'set-cookie',
    'secret',
    'apikey',
    'api_key',
    'session',
    'sessionid',
    'nationalid',
    'card6digits',
    'accountnumber',
    'username',
    'email',
    'usercode',
    'phonenumber',
    'misparzihuy',
    'kodmishtamesh',
    'cardsuffix',
    'sisma',
    'factorvalue',
    'longtermtwofactorauthtoken',
    'persistentotptoken',
    'otpcoderetriever',
  ].map(k => k.toLowerCase()),
);

function normalizeKey(key: string): string {
  return key.replace(/[-_\s]/g, '').toLowerCase();
}

/**
 * Whether an object property name should have its value fully redacted.
 */
export function shouldRedactKey(key: string): boolean {
  const k = key.toLowerCase();
  const compact = normalizeKey(key);
  if (SENSITIVE_KEY_EXACT.has(k) || SENSITIVE_KEY_EXACT.has(compact)) {
    return true;
  }
  if (k.includes('password') || compact.includes('password')) {
    return true;
  }
  if (k.includes('otp') || compact.includes('otp')) {
    return true;
  }
  if (/token$/i.test(key) || compact.endsWith('token')) {
    return true;
  }
  if (k.includes('secret') || compact.includes('secret')) {
    return true;
  }
  if (k === 'authorization' || k === 'cookie' || k === 'set-cookie') {
    return true;
  }
  return false;
}

/**
 * Redact common secret patterns inside free-form strings (JWT, Bearer tokens).
 */
export function redactSensitiveString(input: string): string {
  if (!input) {
    return input;
  }
  let out = input.replace(JWT_LIKE, REDACTED);
  out = out.replace(BEARER, `Bearer ${REDACTED}`);
  out = out.replace(/\bpassword\s*[:=]\s*[^\s&"'<>]{1,128}/gi, `password=${REDACTED}`);
  out = out.replace(/\botp\s*[:=]\s*[^\s&"'<>]{1,64}/gi, `otp=${REDACTED}`);
  return out;
}

const MAX_STRING_PREVIEW = 120;

function truncateForErrorPreview(s: string): string {
  const oneLine = s.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= MAX_STRING_PREVIEW) {
    return oneLine;
  }
  return `${oneLine.slice(0, MAX_STRING_PREVIEW)}…`;
}

/**
 * Deep-clone-ish redaction for logging. Cycles are broken by depth limit.
 */
export function redactDeep(value: unknown, depth = 0): unknown {
  if (depth > 24) {
    return REDACTED;
  }
  if (value === null || value === undefined) {
    return value;
  }
  const t = typeof value;
  if (t === 'string') {
    return redactSensitiveString(value as string);
  }
  if (t === 'number' || t === 'boolean' || t === 'bigint' || t === 'symbol') {
    return value;
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactSensitiveString(value.message),
      stack: REDACTED,
    };
  }
  if (Array.isArray(value)) {
    return value.map(v => redactDeep(v, depth + 1));
  }
  if (t === 'object') {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(o)) {
      if (shouldRedactKey(key)) {
        out[key] = REDACTED;
      } else {
        out[key] = redactDeep(o[key], depth + 1);
      }
    }
    return out;
  }
  return REDACTED;
}

/**
 * Serialize for safe error context (redacted + truncated).
 */
export function redactJsonForErrorPreview(value: unknown): string {
  try {
    const redacted = redactDeep(value);
    return truncateForErrorPreview(JSON.stringify(redacted));
  } catch {
    return REDACTED;
  }
}

export function redactHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(headers)) {
    if (shouldRedactKey(key)) {
      out[key] = REDACTED;
    } else {
      out[key] = redactDeep(headers[key]);
    }
  }
  return out;
}
