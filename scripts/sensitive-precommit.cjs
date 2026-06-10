/**
 * Pre-commit gate: always-on staged sensitive-data checks + optional gitleaks.
 * Install gitleaks: https://github.com/gitleaks/gitleaks/releases
 * STRICT_GITLEAKS=1 — fail when gitleaks is missing (optional).
 */
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function git(args) {
  const r = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (r.status !== 0 && r.error) {
    console.error('[security]', r.error.message);
    process.exit(1);
  }
  return (r.stdout || '').trimEnd();
}

function fail(message) {
  console.error(`[security] Blocked: ${message}`);
  process.exit(1);
}

function runStagedNodeGates() {
  const stagedNames = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const rel of stagedNames) {
    const posix = rel.replace(/\\/g, '/');
    const base = path.posix.basename(posix);
    if (/\.(csv|tsv|xlsx|dump|sql\.gz)$/i.test(base)) {
      fail(`data-export file staged (${posix}). Keep local-only.`);
    }
    if (/^scripts\/tmp-/i.test(posix)) {
      fail(`scratch query file staged (${posix}). Keep under scripts/tmp-* local-only.`);
    }
  }

  const stagedDiff = git([
    'diff',
    '--cached',
    '--unified=0',
    '--',
    '.',
    ':(exclude).gitleaks.toml',
    ':(exclude).gitleaksignore',
    ':(exclude)scripts/sensitive-precommit.cjs',
  ]);

  const stagedText = stagedDiff
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .join('\n');

  if (!stagedText) {
    return;
  }

  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(stagedText)) {
    fail('private key material detected.');
  }

  if (/\b(?:10|127|192\.168|172\.(?:1[6-9]|2[0-9]|3[01]))\.\d{1,3}\.\d{1,3}\b/.test(stagedText)) {
    fail('private/internal IP detected.');
  }

  if (/\b(password|passwd|secret|token|api_key|client_secret)\b\s*[:=]/i.test(stagedText)) {
    fail('possible hardcoded credential assignment.');
  }

  if (/\b(LXC|Proxmox|pve)\b|pct exec|\.(lan|corp|internal)\b/i.test(stagedText)) {
    fail('platform/infrastructure fingerprint detected (LXC/Proxmox/pct/internal host).');
  }
}

function resolveGitleaksExecutable() {
  const exe = process.platform === 'win32' ? 'gitleaks.exe' : 'gitleaks';
  const portable = path.join(repoRoot, 'node_modules', '.bin-tools', 'gitleaks', exe);
  if (fs.existsSync(portable)) {
    return portable;
  }
  return exe;
}

function tryGitleaksStaged() {
  const bin = resolveGitleaksExecutable();
  const attempts = [
    [bin, ['git', '--pre-commit', '--staged', '--config', '.gitleaks.toml', '--redact', '-v', '.']],
    [bin, ['protect', '--staged', '--config', '.gitleaks.toml', '--redact', '--verbose']],
  ];

  for (const [cmd, args] of attempts) {
    const res = spawnSync(cmd, args, {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: false,
    });
    if (res.error) {
      if (res.error.code === 'ENOENT') {
        continue;
      }
      console.error(res.error);
      process.exit(1);
    }
    process.exit(res.status === null ? 1 : res.status);
  }

  console.warn('[security] gitleaks not found in PATH.');
  console.warn(
    '[security] Install: https://github.com/gitleaks/gitleaks/releases (Windows: winget install Gitleaks.Gitleaks)',
  );
  if (process.env.STRICT_GITLEAKS === '1') {
    process.exit(1);
  }
  process.exit(0);
}

console.log('[security] Running staged sensitive-data scan...');
runStagedNodeGates();
tryGitleaksStaged();
