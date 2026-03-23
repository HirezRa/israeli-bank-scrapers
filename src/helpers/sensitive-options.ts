import { type ScraperOptions } from '../scrapers/interface';
import { isRestrictedRuntime, isSensitiveDebugExplicitlyAllowed } from './runtime-mode';

/**
 * Applies production/CI-safe defaults: disables raw transaction payloads, failure screenshots,
 * visible browser, and DEBUG=* verbose mode unless ALLOW_SENSITIVE_DEBUG is set.
 *
 * Returns a shallow copy so callers' option objects are not mutated.
 */
export function resolveScraperOptionsForRuntime(options: ScraperOptions): ScraperOptions {
  if (!isRestrictedRuntime()) {
    return options;
  }
  return {
    ...options,
    includeRawTransaction: false,
    storeFailureScreenShotPath: undefined,
    showBrowser: false,
    verbose: false,
  };
}

/**
 * Whether raw transaction payloads may be attached (honors restricted runtime and ALLOW_SENSITIVE_DEBUG).
 * Use this from standalone helpers; class-based scrapers may use BaseScraper.shouldIncludeRawTransaction().
 */
export function isIncludeRawTransactionEnabled(options: ScraperOptions | undefined): boolean {
  if (!options?.includeRawTransaction) {
    return false;
  }
  if (isSensitiveDebugExplicitlyAllowed()) {
    return true;
  }
  if (isRestrictedRuntime()) {
    return false;
  }
  return true;
}
