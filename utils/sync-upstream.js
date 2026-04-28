/**
 * Maintainer helper: compare this fork to eshaham/israeli-bank-scrapers releases,
 * optionally merge upstream/master, and refresh upstreamSync + docs strings.
 *
 * Usage:
 *   node utils/sync-upstream.js status          (default)
 *   node utils/sync-upstream.js merge --yes     (git fetch upstream && merge upstream/master)
 *   node utils/sync-upstream.js update-metadata [--dry-run]
 *
 * GitHub API: unauthenticated requests are rate-limited; set GH_TOKEN for higher limits.
 */
'use strict';

const https = require('https');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const UPSTREAM_OWNER = 'eshaham';
const UPSTREAM_REPO = 'israeli-bank-scrapers';
const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'hirez-israeli-bank-scrapers-sync-upstream',
      Accept: 'application/vnd.github+json',
    };
    if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GH_TOKEN || process.env.GITHUB_TOKEN}`;
    }
    https
      .get(url, { headers }, (res) => {
        let body = '';
        res.on('data', (c) => {
          body += c;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} ${url}\n${body.slice(0, 500)}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Invalid JSON from ${url}: ${e.message}`));
          }
        });
      })
      .on('error', reject);
  });
}

function compareTagNames(a, b) {
  const pa = a.replace(/^v/i, '').split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.replace(/^v/i, '').split('.').map((x) => parseInt(x, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i += 1) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

async function fetchLatestRelease() {
  const url = `https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/releases/latest`;
  return httpGetJson(url);
}

async function resolveTagCommitSha(tagName) {
  const enc = encodeURIComponent(tagName);
  const url = `https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/git/ref/tags/${enc}`;
  const ref = await httpGetJson(url);
  const { sha, type } = ref.object || {};
  if (!sha) {
    throw new Error(`No sha for tag ${tagName}: ${JSON.stringify(ref)}`);
  }
  if (type === 'commit') {
    return sha;
  }
  // annotated tag → peel
  const tagUrl = `https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/git/tags/${sha}`;
  const tagObj = await httpGetJson(tagUrl);
  if (tagObj.object && tagObj.object.sha) {
    return tagObj.object.sha;
  }
  throw new Error(`Could not peel tag ${tagName}`);
}

function readPackageJson() {
  const raw = fs.readFileSync(PKG_PATH, 'utf8');
  return { raw, pkg: JSON.parse(raw) };
}

function runGit(args, opts = {}) {
  return spawnSync('git', args, {
    encoding: 'utf8',
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  });
}

async function cmdStatus() {
  const release = await fetchLatestRelease();
  const tagName = release.tag_name;
  const commitSha = await resolveTagCommitSha(tagName);
  const { pkg } = readPackageJson();
  const local = pkg.upstreamSync || {};
  const cmp = compareTagNames(tagName, local.tag || 'v0.0.0');

  console.log('Upstream latest release:', tagName);
  console.log('Upstream tag commit:    ', commitSha);
  console.log('This fork upstreamSync: ', local.tag, local.commit || '(missing)');

  if (cmp > 0) {
    console.log('\nStatus: BEHIND — upstream has a newer release than package.json upstreamSync.tag');
    console.log('Next:    git fetch upstream && git merge upstream/master');
    console.log('         (resolve conflicts), then: npm run sync:upstream:metadata');
    process.exitCode = 1;
    return;
  }
  if (cmp < 0) {
    console.log('\nStatus: AHEAD (local upstreamSync.tag is newer than GitHub latest — unusual; verify manually)');
    process.exitCode = 0;
    return;
  }
  if (local.commit && local.commit !== commitSha) {
    console.log('\nStatus: TAG matches but COMMIT differs — verify branch/tag alignment on upstream');
    process.exitCode = 1;
    return;
  }
  console.log('\nStatus: OK — fork metadata matches upstream latest release');
}

function cmdMerge() {
  const yes = process.argv.includes('--yes');
  if (!yes) {
    console.error('Refusing to merge without --yes (rewrites working tree).');
    console.error('Run: node utils/sync-upstream.js merge --yes');
    process.exit(1);
  }
  const fetch = runGit(['fetch', 'upstream']);
  if (fetch.status !== 0) {
    console.error(fetch.stderr || fetch.stdout);
    process.exit(fetch.status || 1);
  }
  const merge = runGit(['merge', 'upstream/master', '-m', 'chore: merge upstream/master']);
  console.log(merge.stdout);
  if (merge.stderr) console.error(merge.stderr);
  if (merge.status !== 0) {
    process.exit(merge.status || 1);
  }
  console.log('\nMerge finished. Run tests, then: npm run sync:upstream:metadata');
}

async function cmdUpdateMetadata() {
  const dry = process.argv.includes('--dry-run');
  const release = await fetchLatestRelease();
  const tagName = release.tag_name;
  const commitSha = await resolveTagCommitSha(tagName);
  const { pkg } = readPackageJson();
  const old = pkg.upstreamSync || {};

  const nextSync = {
    repo: `${UPSTREAM_OWNER}/${UPSTREAM_REPO}`,
    tag: tagName,
    commit: commitSha,
  };

  if (dry) {
    console.log(JSON.stringify({ wouldSet: nextSync, previous: old }, null, 2));
    return;
  }

  pkg.upstreamSync = nextSync;
  if (typeof pkg.description === 'string') {
    pkg.description = pkg.description.replace(
      /upstream base v[\d.]+/i,
      `upstream base ${tagName}`,
    );
  }
  fs.writeFileSync(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

  const docFiles = ['README.md', 'SECURITY.md'];
  for (const rel of docFiles) {
    const fp = path.join(ROOT, rel);
    if (!fs.existsSync(fp)) continue;
    let text = fs.readFileSync(fp, 'utf8');
    if (old.tag) text = text.split(old.tag).join(tagName);
    if (old.commit) text = text.split(old.commit).join(commitSha);
    fs.writeFileSync(fp, text, 'utf8');
  }

  console.log('Updated package.json upstreamSync and refreshed tag/commit in README.md, SECURITY.md');
  console.log('Review diff, update README "Sync status" line if the upstream version changed, then commit.');
}

async function main() {
  const cmd = process.argv[2] || 'status';
  if (cmd === 'status' || cmd === 'check') {
    await cmdStatus();
    return;
  }
  if (cmd === 'merge') {
    cmdMerge();
    return;
  }
  if (cmd === 'update-metadata') {
    await cmdUpdateMetadata();
    return;
  }
  console.error(`Unknown command: ${cmd}`);
  console.error('Use: status | merge --yes | update-metadata [--dry-run]');
  process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
