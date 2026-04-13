import { type ScraperOptions } from '../scrapers/interface';

/**
 * When true, sensitive debug features must be disabled unless explicitly opted in.
 * Restricted when NODE_ENV=production or CI is set, unless ALLOW_SENSITIVE_DEBUG is truthy.
 */
export function isRestrictedSensitiveRuntime(): boolean {
  const allow = process.env.ALLOW_SENSITIVE_DEBUG;
  if (allow === '1' || allow === 'true') {
    return false;
  }
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  if (process.env.CI === 'true' || process.env.CI === '1') {
    return true;
  }
  return false;
}

/** Strip query and fragment from a URL for safe logging. */
export function sanitizeUrlForLogs(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return '[invalid-url]';
  }
}

/**
 * Applies fork security defaults for createScraper() and direct scraper construction.
 */
export function normalizeScraperOptionsForRuntime(options: ScraperOptions): ScraperOptions {
  if (!isRestrictedSensitiveRuntime()) {
    return options;
  }

  const next: ScraperOptions = {
    ...options,
    verbose: false,
    includeRawTransaction: false,
    storeFailureScreenShotPath: undefined,
  };

  if ('showBrowser' in next) {
    (next as ScraperOptions & { showBrowser?: boolean }).showBrowser = false;
  }

  return next;
}
