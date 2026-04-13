/**
 * Remove compiled test artifacts from lib/ so npm pack matches publish intent (no *.test.js in tarball).
 */
const fs = require('fs');
const path = require('path');

const libRoot = path.join(__dirname, '../lib');

function rmRecursive(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

rmRecursive(path.join(libRoot, 'tests'));

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full);
    } else if (/\.test\.(js|d\.ts)$/.test(ent.name) || /\.test\.js\.map$/.test(ent.name)) {
      fs.unlinkSync(full);
    }
  }
}

walk(libRoot);
