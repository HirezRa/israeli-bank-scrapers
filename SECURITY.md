# Security and privacy (hardened fork)

This library automates access to financial institutions. Use it only where you are allowed to, protect credentials at rest and in transit, and never commit real passwords, OTPs, or tokens to source control or logs.

## Runtime defaults

`BaseScraper` normalizes options for **every** scraper instance, whether created with `createScraper()` or via `new SomeScraper(options)`.

### Restricted runtimes

When **either** of the following is true, the fork treats the process as **restricted** unless you explicitly opt out:

- `NODE_ENV` is `production`
- `CI` is `true` or `1`

**Opt out (use only when you intentionally need sensitive debugging in those environments):**

- Set `ALLOW_SENSITIVE_DEBUG` to `1` or `true`.

### What is forced off in restricted runtimes

| Option | Behavior |
|--------|----------|
| `verbose` | Forced `false` (no `DEBUG=*` injection into the browser launch env). |
| `showBrowser` | Forced `false` when the option exists (default browser launch path). |
| `includeRawTransaction` | Forced `false`. |
| `storeFailureScreenShotPath` | Cleared (no failure screenshots written). |

## Logging and errors

- **`sanitizeUrlForLogs(url)`** (exported from the package) strips query strings and fragments so logs and error messages are less likely to leak session or tracking parameters.
- Navigation and failed-request debug lines in the browser base scraper use sanitized URLs where full URLs would be logged.

## Testing

- Do **not** commit `src/tests/.tests-config.js` or real `TESTS_CONFIG` JSON. Use the template and local-only config.
- Prefer RFC 2606-style placeholders (`@example.com`) in tests instead of real-looking email domains.

## Publishing

- Run `npm pack --dry-run` before `npm publish` and confirm the tarball only contains intended files (`lib/**/*` and this `SECURITY.md` per `package.json` `files`). The `postbuild` step runs `utils/clean-lib-tests.js` so compiled `*.test.js` / `*.test.d.ts` are not shipped under `lib/`.
- Run `npm audit` after dependency changes.

## Upstream

Security behavior in this document applies on top of [eshaham/israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers). See `upstreamSync` in `package.json` for the exact upstream tag and commit this fork last merged.
