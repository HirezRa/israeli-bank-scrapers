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
- **CI:** GitHub Actions publishes with a **granular `NPM_TOKEN`** (environment `npm-publish`). Provenance is disabled for token-based publish (`NPM_CONFIG_PROVENANCE=false`) to avoid `E404` conflicts between OIDC provenance and classic token auth; you can later switch to [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) on npm if you want OIDC-only releases. **Local** publishes use `npm run publish:local` after `npm run build` and `node utils/pre-publish.js --version <semver>`.
- **`npm ERR! E404` on publish** (scoped package): often **no publish permission** on `@hirez10`, wrong npm user, or an expired/under-scoped token — npm sometimes reports that as 404. Confirm org membership and token **publish** rights on [npmjs.com](https://www.npmjs.com). If **GitHub** already shows a newer `hirez-v*` release than npm, fix the token/workflow then follow [npm publish recovery](./CONTRIBUTING.md#npm-publish-recovery-github-ahead-of-npm).

## Upstream

Security behavior in this document applies on top of [eshaham/israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers).

**Last merged upstream release:** **[v6.7.4](https://github.com/eshaham/israeli-bank-scrapers/releases/tag/v6.7.4)** ([`847f5f74e3923c3993b802c7a25fe12b30c1d18c`](https://github.com/eshaham/israeli-bank-scrapers/commit/847f5f74e3923c3993b802c7a25fe12b30c1d18c)). The same values are recorded under `upstreamSync` in `package.json` for automation and release notes.
