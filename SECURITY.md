# Security & privacy

This library automates access to financial institutions. Treat all data that flows through it as **highly sensitive**.

## Threat model

- **Credentials** (passwords, OTPs, national IDs, card digits, tokens) must never appear in logs, error messages, CI output, screenshots, or version control.
- **Scraping results** (account numbers, balances, transaction descriptions) must not be written to debug logs in production or shared CI environments without explicit, conscious opt-in.

## Runtime hardening (built-in)

**All scrapers** inherit from `BaseScraper`, whose constructor applies `resolveScraperOptionsForRuntime()`. That means **`createScraper()` and direct `new SomeScraper(options)` are both protected** the same way in production/CI.

When **`NODE_ENV=production`** or **`CI`** is set to a truthy value (`true` / `1`), the following options are **forced off** unless **`ALLOW_SENSITIVE_DEBUG=1`** (or `true`) is set in the environment:

| Option | Risk if misused |
|--------|------------------|
| `includeRawTransaction` | Exposes full provider payloads (PII, internal IDs). |
| `storeFailureScreenShotPath` | Screenshots can show logged-in banking UI. |
| `showBrowser` | Visible UI in shared environments; easier shoulder-surfing. |
| `verbose` | Enables broad `DEBUG=*`-style logging from dependencies. |

Local development without `production` / `CI` keeps prior behavior: you can still enable these options explicitly.

`createScraper()` and every concrete scraper constructor apply the same rules via `BaseScraper` → `resolveScraperOptionsForRuntime()`. Callers should still treat `options` as **read-only** after construction to avoid accidentally re-enabling sensitive flags at runtime.

## Error handling & logging

- Thrown errors and `errorMessage` fields returned from `scrape()` are passed through **sanitization** so raw HTTP bodies, headers, and credentials are not embedded in messages.
- Use the **`debug`** namespace (`DEBUG=israeli-bank-scrapers:*`) only in trusted environments; never enable it in production unless you understand what subsystems may log.
- Prefer **`redactDeep()`** / **`redactSensitiveString()`** (exported from the package entry) when logging structured objects.
- Use **`sanitizeUrlForLogs()`** for any URL written to logs, debug output, or `Error` messages (strips query, fragment, and `user:pass@` via `URL` parsing).
- **Never** put raw request/response bodies, headers, cookies, or institute error payloads into `throw new Error(...)`. Use `sanitizeExternalServiceMessage()` or generic codes.

### Maintainer guardrails

- Do not log raw responses from financial providers.
- Do not concatenate credentials, OTPs, or session tokens into exception text.
- Prefer central helpers in `src/helpers/safe-error.ts` and `src/helpers/redaction.ts` over ad-hoc string cleanup.

## Dependencies

Run `npm audit` regularly and upgrade patch/minor versions when they address vulnerabilities. Major upgrades (e.g. Puppeteer) require separate validation against bank sites.

### npm audit triage (snapshot — re-run `npm audit` after lockfile changes)

The **`prettier-eslint`** package was removed (PR4): lint already ran **ESLint** and **Prettier** separately; the extra dependency only pulled a vulnerable nested `minimatch` chain without being invoked by any script.

`npm audit` was **clean** (`0` findings) after that removal at the time of the last lockfile refresh. Re-run after upgrades; new advisories in **dev-only** tools (ESLint, Jest, etc.) may appear and should be triaged similarly.

| Package | Severity | Direct / transitive | How it enters the graph | Reachable at runtime? | Action |
|--------|----------|----------------------|-------------------------|------------------------|--------|
| **basic-ftp** | was critical | transitive (`puppeteer` → `@puppeteer/browsers` → … → `get-uri`) | Browser download / proxy stack | Not used for scraping logic; no `downloadToDir` from app code | **Mitigated:** `overrides` force `basic-ftp@^5.2.0` |
| **lodash** | moderate | **direct** (runtime) | App code | **Yes** | `^4.17.21`; if npm reports [GHSA-xxjr-mmjv-4gpg](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg) again, track patched 4.x in range |

**Puppeteer:** npm reports the pinned major as deprecated; upgrading to ≥24.x is a **separate PR** (Chromium behavior, breaking API risk).

**Published tarball:** `npm pack` should list only `lib/**`, `SECURITY.md`, and metadata — no `*.test.js` (Babel ignores `*.test.ts`, `postbuild` removes stray tests).

## Reporting issues

Do **not** open public issues or PRs that contain real credentials, account numbers, OTPs, tokens, or unredacted HTML/JSON from banks. Use private disclosure if your findings are exploitable.

## Testing & CI

- Never commit `src/tests/.tests-config.js` or real values in `TESTS_CONFIG`.
- Prefer mock-based tests for new code paths; integration tests with real institutions belong only in private, credential-isolated runners.
