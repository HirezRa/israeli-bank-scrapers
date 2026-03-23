import { CompanyTypes } from '../definitions';
import { type ScraperOptions } from '../scrapers/interface';
import { isIncludeRawTransactionEnabled, resolveScraperOptionsForRuntime } from './sensitive-options';

const baseOptions = (): ScraperOptions => ({
  companyId: CompanyTypes.leumi,
  startDate: new Date('2020-01-01'),
  includeRawTransaction: true,
  showBrowser: true,
  verbose: true,
  storeFailureScreenShotPath: '/tmp/x.png',
});

describe('sensitive-options', () => {
  let prevCi: string | undefined;
  let prevNodeEnv: string | undefined;
  let prevAllow: string | undefined;

  beforeEach(() => {
    prevCi = process.env.CI;
    prevNodeEnv = process.env.NODE_ENV;
    prevAllow = process.env.ALLOW_SENSITIVE_DEBUG;
  });

  afterEach(() => {
    if (prevCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = prevCi;
    }
    if (prevNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = prevNodeEnv;
    }
    if (prevAllow === undefined) {
      delete process.env.ALLOW_SENSITIVE_DEBUG;
    } else {
      process.env.ALLOW_SENSITIVE_DEBUG = prevAllow;
    }
  });

  test('resolveScraperOptionsForRuntime leaves options unchanged outside restricted runtime', () => {
    delete process.env.CI;
    delete process.env.NODE_ENV;
    delete process.env.ALLOW_SENSITIVE_DEBUG;
    const o = baseOptions();
    const r = resolveScraperOptionsForRuntime(o);
    expect(r).toBe(o);
    expect(r.includeRawTransaction).toBe(true);
  });

  test('resolveScraperOptionsForRuntime strips sensitive flags in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_SENSITIVE_DEBUG;
    const r = resolveScraperOptionsForRuntime(baseOptions());
    expect(r.includeRawTransaction).toBe(false);
    expect((r as { showBrowser?: boolean }).showBrowser).toBe(false);
    expect(r.verbose).toBe(false);
    expect(r.storeFailureScreenShotPath).toBeUndefined();
  });

  test('ALLOW_SENSITIVE_DEBUG restores caller flags in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_SENSITIVE_DEBUG = '1';
    const o = baseOptions();
    const r = resolveScraperOptionsForRuntime(o);
    expect(r).toBe(o);
  });

  test('isIncludeRawTransactionEnabled is false in CI even if option is true', () => {
    process.env.CI = 'true';
    delete process.env.ALLOW_SENSITIVE_DEBUG;
    expect(isIncludeRawTransactionEnabled(baseOptions())).toBe(false);
  });
});
