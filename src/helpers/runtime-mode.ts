/**
 * Runtime classification for secure defaults (screenshots, raw payloads, verbose debug).
 * Local development keeps previous behavior unless CI/production flags are set.
 */

export function isSensitiveDebugExplicitlyAllowed(): boolean {
  const v = process.env.ALLOW_SENSITIVE_DEBUG;
  return v === '1' || v === 'true';
}

/**
 * True when running under typical CI providers.
 */
export function isCiEnvironment(): boolean {
  const ci = process.env.CI;
  return ci === 'true' || ci === '1';
}

/**
 * True when NODE_ENV is production.
 */
export function isNodeProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Environments where sensitive debug features must be off unless ALLOW_SENSITIVE_DEBUG is set.
 */
export function isRestrictedRuntime(): boolean {
  if (isSensitiveDebugExplicitlyAllowed()) {
    return false;
  }
  return isNodeProduction() || isCiEnvironment();
}
