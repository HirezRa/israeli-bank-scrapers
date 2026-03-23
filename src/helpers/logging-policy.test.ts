import fs from 'fs';
import path from 'path';

/**
 * Lightweight regression guard: institution scrapers must not embed transaction text
 * or account identifiers in debug() calls (see SECURITY.md).
 */
describe('logging policy (regression)', () => {
  it('mizrahi.ts does not pass txn.description into debug()', () => {
    const file = path.join(__dirname, '../scrapers/mizrahi.ts');
    const src = fs.readFileSync(file, 'utf8');
    expect(src).not.toMatch(/debug\s*\([^)]*txn\.description/s);
  });

  it('beyahad-bishvilha.ts does not log account number substrings in debug()', () => {
    const file = path.join(__dirname, '../scrapers/beyahad-bishvilha.ts');
    const src = fs.readFileSync(file, 'utf8');
    expect(src).not.toMatch(/accountNumber\.substring/s);
  });
});
