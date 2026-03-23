export { CompanyTypes, SCRAPERS } from './definitions';
export { REDACTED, redactDeep, redactHeaders, redactSensitiveString, shouldRedactKey } from './helpers/redaction';
export {
  isCiEnvironment,
  isNodeProduction,
  isRestrictedRuntime,
  isSensitiveDebugExplicitlyAllowed,
} from './helpers/runtime-mode';
export {
  publicErrorMessageFromUnknown,
  safeUrlForError,
  sanitizeExternalServiceMessage,
  sanitizeUrlForLogs,
} from './helpers/safe-error';
export { isIncludeRawTransactionEnabled, resolveScraperOptionsForRuntime } from './helpers/sensitive-options';
export { default as createScraper } from './scrapers/factory';

// Note: the typo ScaperScrapingResult & ScraperLoginResult (sic) are exported here for backward compatibility
export {
  ScraperLoginResult as ScaperLoginResult,
  ScraperScrapingResult as ScaperScrapingResult,
  Scraper,
  ScraperCredentials,
  ScraperLoginResult,
  ScraperOptions,
  ScraperScrapingResult,
} from './scrapers/interface';

export { default as OneZeroScraper } from './scrapers/one-zero';

export function getPuppeteerConfig() {
  return { chromiumRevision: '1250580' }; // https://github.com/puppeteer/puppeteer/releases/tag/puppeteer-core-v22.5.0
}
