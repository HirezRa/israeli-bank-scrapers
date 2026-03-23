/**
 * PR2: failure paths, direct instantiation, URL hygiene, fetch error surfaces — no live institutions.
 */
import nodeFetch from 'node-fetch';
import { CompanyTypes } from '../definitions';
import HapoalimScraper from '../scrapers/hapoalim';
import OneZeroScraper from '../scrapers/one-zero';
import { type ScraperOptions } from '../scrapers/interface';
import { redactDeep, REDACTED } from './redaction';
import { fetchGet } from './fetch';
import { createSafeInPageFetchError, publicErrorMessageFromUnknown, sanitizeUrlForLogs } from './safe-error';
import { isIncludeRawTransactionEnabled, resolveScraperOptionsForRuntime } from './sensitive-options';

jest.mock('node-fetch', () => jest.fn());

const mockedFetch = nodeFetch as jest.MockedFunction<typeof nodeFetch>;

describe('PR2 security hardening', () => {
  let prevCi: string | undefined;
  let prevNodeEnv: string | undefined;
  let prevAllow: string | undefined;

  beforeEach(() => {
    prevCi = process.env.CI;
    prevNodeEnv = process.env.NODE_ENV;
    prevAllow = process.env.ALLOW_SENSITIVE_DEBUG;
    mockedFetch.mockReset();
  });

  afterEach(() => {
    if (prevCi === undefined) delete process.env.CI;
    else process.env.CI = prevCi;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevAllow === undefined) delete process.env.ALLOW_SENSITIVE_DEBUG;
    else process.env.ALLOW_SENSITIVE_DEBUG = prevAllow;
  });

  const sensitiveOpts = (): ScraperOptions =>
    ({
      companyId: CompanyTypes.hapoalim,
      startDate: new Date('2020-01-01'),
      includeRawTransaction: true,
      showBrowser: true,
      verbose: true,
      storeFailureScreenShotPath: '/tmp/leak.png',
    }) as ScraperOptions;

  test('direct HapoalimScraper instantiation applies restricted-runtime option stripping', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_SENSITIVE_DEBUG;
    const s = new HapoalimScraper(sensitiveOpts());
    expect(s.options.includeRawTransaction).toBe(false);
    expect((s.options as { showBrowser?: boolean }).showBrowser).toBe(false);
    expect(s.options.verbose).toBe(false);
    expect(s.options.storeFailureScreenShotPath).toBeUndefined();
  });

  test('direct OneZeroScraper respects ALLOW_SENSITIVE_DEBUG in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_SENSITIVE_DEBUG = '1';
    const s = new OneZeroScraper({
      ...sensitiveOpts(),
      companyId: CompanyTypes.oneZero,
    } as ScraperOptions);
    expect(s.options.includeRawTransaction).toBe(true);
  });

  test('resolveScraperOptionsForRuntime matches BaseScraper normalization in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_SENSITIVE_DEBUG;
    const resolved = resolveScraperOptionsForRuntime(sensitiveOpts());
    const s = new HapoalimScraper(sensitiveOpts());
    expect(s.options.includeRawTransaction).toBe(resolved.includeRawTransaction);
    expect((s.options as { showBrowser?: boolean }).showBrowser).toBe(
      (resolved as { showBrowser?: boolean }).showBrowser,
    );
  });

  test('isIncludeRawTransactionEnabled false in CI for raw flag', () => {
    process.env.CI = 'true';
    delete process.env.ALLOW_SENSITIVE_DEBUG;
    expect(isIncludeRawTransactionEnabled(sensitiveOpts())).toBe(false);
  });

  test('sanitizeUrlForLogs removes query, fragment, and userinfo', () => {
    expect(sanitizeUrlForLogs('https://user:pass@bank.example/a/b?token=secret&x=1#frag')).toBe(
      'https://bank.example/a/b',
    );
  });

  test('createSafeInPageFetchError never embeds secret query values', () => {
    const url = 'https://api.bank.example/graphql?access_token=abc.def.ghi&otp=123456';
    const err = createSafeInPageFetchError('op', url, 'parse', 500);
    expect(err.message).not.toContain('access_token');
    expect(err.message).not.toContain('abc.def');
    expect(err.message).toContain('api.bank.example');
  });

  test('fetchGet error message is sanitized for URL with secrets', async () => {
    mockedFetch.mockResolvedValue({
      status: 401,
      json: () => Promise.resolve({}),
    } as any);
    const evilUrl = 'https://institute.example/path?session=SECRETSESSION&password=foo';
    let msg = '';
    try {
      await fetchGet(evilUrl, {});
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/institute\.example\/path/);
    expect(msg).not.toContain('SECRETSESSION');
    expect(msg).not.toContain('password=foo');
  });

  test('publicErrorMessageFromUnknown unwraps Error.cause without leaking nested secrets', () => {
    const inner = new Error('password=innerleak');
    const outer = new Error('outer');
    (outer as Error & { cause?: unknown }).cause = inner;
    const msg = publicErrorMessageFromUnknown(outer);
    expect(msg).not.toContain('innerleak');
    expect(msg).toContain('[cause:');
  });

  test('redactDeep handles nested arrays and errors', () => {
    const o = {
      items: [{ token: 'x' }, { ok: 1 }],
      err: new Error('password=zzz'),
    };
    const r = redactDeep(o) as Record<string, unknown>;
    expect((r.items as unknown[])[0]).toEqual({ token: REDACTED });
    expect((r.err as Record<string, unknown>).stack).toBe(REDACTED);
  });
});
