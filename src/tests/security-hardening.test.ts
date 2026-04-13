import { CompanyTypes } from '../definitions';
import {
  isRestrictedSensitiveRuntime,
  normalizeScraperOptionsForRuntime,
  sanitizeUrlForLogs,
} from '../helpers/security-runtime';
import { type ScraperOptions } from '../scrapers/interface';

describe('security-runtime', () => {
  const envKeys = ['NODE_ENV', 'CI', 'ALLOW_SENSITIVE_DEBUG'] as const;
  const snapshot: Partial<Record<(typeof envKeys)[number], string | undefined>> = {};

  beforeEach(() => {
    envKeys.forEach(k => {
      snapshot[k] = process.env[k];
    });
  });

  afterEach(() => {
    envKeys.forEach(k => {
      if (snapshot[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = snapshot[k];
      }
    });
  });

  describe('sanitizeUrlForLogs', () => {
    it('strips query and hash', () => {
      expect(sanitizeUrlForLogs('https://bank.example/path?token=secret&x=1#frag')).toBe('https://bank.example/path');
    });

    it('returns placeholder for invalid url', () => {
      expect(sanitizeUrlForLogs('not a url')).toBe('[invalid-url]');
    });
  });

  describe('isRestrictedSensitiveRuntime', () => {
    it('is false when ALLOW_SENSITIVE_DEBUG is set', () => {
      delete process.env.NODE_ENV;
      delete process.env.CI;
      process.env.ALLOW_SENSITIVE_DEBUG = '1';
      expect(isRestrictedSensitiveRuntime()).toBe(false);
    });

    it('is true in production without opt-in', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CI;
      delete process.env.ALLOW_SENSITIVE_DEBUG;
      expect(isRestrictedSensitiveRuntime()).toBe(true);
    });

    it('is true when CI is set without opt-in', () => {
      delete process.env.NODE_ENV;
      process.env.CI = 'true';
      delete process.env.ALLOW_SENSITIVE_DEBUG;
      expect(isRestrictedSensitiveRuntime()).toBe(true);
    });
  });

  describe('normalizeScraperOptionsForRuntime', () => {
    it('forces sensitive flags off when restricted', () => {
      process.env.CI = 'true';
      delete process.env.ALLOW_SENSITIVE_DEBUG;

      const base: ScraperOptions = {
        companyId: CompanyTypes.leumi,
        startDate: new Date(),
        showBrowser: true,
        verbose: true,
        includeRawTransaction: true,
        storeFailureScreenShotPath: '/tmp/x.png',
      };

      const normalized = normalizeScraperOptionsForRuntime(base);
      expect('showBrowser' in normalized && normalized.showBrowser).toBe(false);
      expect(normalized.verbose).toBe(false);
      expect(normalized.includeRawTransaction).toBe(false);
      expect(normalized.storeFailureScreenShotPath).toBeUndefined();
    });

    it('leaves options unchanged when not restricted', () => {
      delete process.env.NODE_ENV;
      delete process.env.CI;
      delete process.env.ALLOW_SENSITIVE_DEBUG;

      const base = {
        companyId: CompanyTypes.leumi,
        startDate: new Date(),
        verbose: true,
        includeRawTransaction: true,
      };

      const normalized = normalizeScraperOptionsForRuntime(base);
      expect(normalized).toBe(base);
    });
  });
});
