import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'src');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(full);
  }
  return out;
}

const fixed = [];

for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, 'utf8');
  const before = src;
  const lines = src.split('\n');

  // Collect import statement ranges (line start/end inclusive)
  const importRanges = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t.startsWith('import ') && t !== 'import {') continue;
    let end = i;
    if (!t.includes(' from ') && !t.endsWith("';") && !t.endsWith("';")) {
      // multi-line
      for (let j = i + 1; j < lines.length; j++) {
        end = j;
        if (lines[j].includes(' from ')) break;
      }
    }
    importRanges.push([i, end]);
    i = end;
  }

  if (importRanges.length === 0) continue;

  // Find first non-import code line
  let firstCode = -1;
  let inImport = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('*/') || /^['"]use /.test(t) || t.startsWith('// @ts')) {
      continue;
    }
    const isImpStart = t.startsWith('import ') || t === 'import {';
    if (isImpStart) {
      inImport = !(t.includes(' from ') || /from\s+['"]/.test(t));
      if (t.includes(' from ') || /;\s*$/.test(t)) inImport = false;
      continue;
    }
    if (inImport) {
      if (t.includes(' from ')) inImport = false;
      continue;
    }
    firstCode = i;
    break;
  }

  if (firstCode < 0) continue;

  // Imports that start after firstCode — move them up
  const late = importRanges.filter(([start]) => start > firstCode);
  if (late.length === 0) continue;

  // Extract late import blocks (reverse so indices stay valid)
  const blocks = [];
  for (let k = late.length - 1; k >= 0; k--) {
    const [start, end] = late[k];
    blocks.unshift(lines.slice(start, end + 1));
    lines.splice(start, end - start + 1);
  }

  // Recompute insert point: end of leading import block
  let insertAt = 0;
  inImport = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('*/') || /^['"]use /.test(t) || t.startsWith('// @ts')) {
      if (insertAt > 0 && !inImport) break;
      continue;
    }
    if (t.startsWith('import ') || t === 'import {') {
      inImport = !(t.includes(' from '));
      insertAt = i + 1;
      if (t.includes(' from ')) inImport = false;
      continue;
    }
    if (inImport) {
      insertAt = i + 1;
      if (t.includes(' from ')) inImport = false;
      continue;
    }
    break;
  }

  const flat = blocks.flat();
  lines.splice(insertAt, 0, ...flat);

  src = lines.join('\n');
  // collapse triple blank lines
  src = src.replace(/\n{3,}/g, '\n\n');

  if (src !== before) {
    fs.writeFileSync(file, src);
    fixed.push(path.relative(ROOT, file).replace(/\\/g, '/'));
  }
}

console.log('Fixed late imports in', fixed.length, 'files');
fixed.forEach((f) => console.log(' -', f));
