/**
 * Wrapper for local `npm publish` (CI uses .github/workflows/release.yml).
 *
 * Reads optional environment variables:
 *   NPM_OTP   one-time 2FA code (passed as `--otp <code>`)
 *   NPM_TAG   dist-tag (defaults to "latest")
 *
 * Fails fast when not logged in and prints actionable hints on common errors:
 *   E404  scope/permission problem on @hirez10
 *   E403  2FA required → set NPM_OTP, or use a granular token with bypass-2fa
 *   EUSAGE provenance not supported locally → drop publishConfig.provenance
 */
const { spawnSync } = require('child_process');

function run(cmd, args) {
  return spawnSync(cmd, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const who = run('npm', ['whoami']);
if (who.status !== 0) {
  console.error('[publish:local] npm whoami failed — registry auth missing.');
  console.error('Run: npm login');
  console.error('Or set a granular NPM token in %USERPROFILE%\\.npmrc, e.g.');
  console.error('  //registry.npmjs.org/:_authToken=npm_xxx');
  process.exit(1);
}
console.error(`[publish:local] npm user: ${(who.stdout || '').trim()}`);

const args = ['publish', '--access', 'public', '--ignore-scripts'];
if (process.env.NPM_TAG) {
  args.push('--tag', process.env.NPM_TAG);
}
if (process.env.NPM_OTP) {
  args.push('--otp', process.env.NPM_OTP);
}

const pub = run('npm', args);
if (pub.stdout) process.stdout.write(pub.stdout);
if (pub.stderr) process.stderr.write(pub.stderr);

const code = pub.status ?? 1;
const blob = `${pub.stderr || ''}${pub.stdout || ''}`;

if (code !== 0) {
  console.error('');
  if (/EUSAGE.*provenance/i.test(blob) || /Automatic provenance generation/i.test(blob)) {
    console.error('[publish:local] npm tried automatic provenance and failed.');
    console.error('Remove "provenance": true from "publishConfig" in package.json (CI handles provenance separately).');
  } else if (/code E403|Two-factor authentication|granular access token with bypass 2fa/i.test(blob)) {
    console.error('[publish:local] 2FA required. Re-run with NPM_OTP set:');
    console.error('  $env:NPM_OTP="123456"; npm run publish:local');
    console.error('Or create a granular npm token with "Bypass 2FA" enabled and put it in %USERPROFILE%\\.npmrc.');
  } else if (/code E404|404 Not Found/i.test(blob)) {
    console.error('[publish:local] E404 on @hirez10/israeli-bank-scrapers usually means missing publish');
    console.error('permission on the @hirez10 scope. Check org membership / token scope on npmjs.com.');
  }
}

process.exit(code);
