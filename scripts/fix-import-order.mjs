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

  // Find getAuthToken import that sits after a non-import statement
  const lines = src.split('\n');
  const authImportIdx = lines.findIndex((l) =>
    /import\s*\{[^}]*\bgetAuthToken\b[^}]*\}\s*from\s*['"]@\/lib\/auth-utils['"]/.test(l),
  );
  if (authImportIdx < 0) continue;

  // If any non-import, non-empty, non-comment, non-directive line appears before this import
  // after we've already left the import block, move it up.
  let leftImportBlock = false;
  let needsMove = false;
  for (let i = 0; i < authImportIdx; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('*/')) continue;
    if (t.startsWith('import ') || t.startsWith('import{') || t === 'import {') {
      leftImportBlock = false;
      continue;
    }
    // continuation of multi-line import
    if (!leftImportBlock && (t.startsWith('}') || t.includes(' from ') || t.endsWith(',') || /^[A-Za-z0-9_{}\s,]+$/.test(t))) {
      // ambiguous — if previous was import-ish keep going
      const prev = lines[i - 1]?.trim() || '';
      if (prev.startsWith('import') || prev.endsWith(',') || prev === 'import {') continue;
    }
    leftImportBlock = true;
    if (leftImportBlock && (t.startsWith('const ') || t.startsWith('let ') || t.startsWith('var ') || t.startsWith('type ') || t.startsWith('export ') || t.startsWith('function ') || t.startsWith('interface '))) {
      needsMove = true;
      break;
    }
  }

  if (!needsMove) {
    // Also detect: auth import then const then another import
    const after = lines.slice(authImportIdx + 1, authImportIdx + 8).join('\n');
    if (/^(const|let|var|type|interface|export|function)\b/m.test(lines[authImportIdx + 1] || '') &&
        lines.slice(authImportIdx + 1, authImportIdx + 15).some((l) => /^import\s/.test(l.trim()) || l.trim() === 'import {')) {
      needsMove = true;
    }
  }

  if (!needsMove) continue;

  const authLine = lines[authImportIdx];
  lines.splice(authImportIdx, 1);

  // Find last consecutive import at top
  let insertAt = 0;
  let inMulti = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || /^['"]use /.test(t) || t.startsWith('// @ts')) {
      if (insertAt > 0 && !inMulti) break;
      continue;
    }
    if (t.startsWith('import ') || t === 'import {') {
      inMulti = !t.includes(' from ') && !t.endsWith(';');
      insertAt = i + 1;
      continue;
    }
    if (inMulti) {
      if (t.includes(' from ') || (t.startsWith('}') && t.includes('from'))) {
        inMulti = false;
        insertAt = i + 1;
      }
      continue;
    }
    break;
  }

  // Avoid duplicate
  if (lines.some((l) => /import\s*\{[^}]*\bgetAuthToken\b[^}]*\}\s*from\s*['"]@\/lib\/auth-utils['"]/.test(l))) {
    // already present elsewhere after removal? we removed one; check
  }
  const stillHas = lines.some((l) =>
    /import\s*\{[^}]*\bgetAuthToken\b[^}]*\}\s*from\s*['"]@\/lib\/auth-utils['"]/.test(l),
  );
  if (!stillHas) {
    lines.splice(insertAt, 0, authLine.endsWith(';') ? authLine : `${authLine.replace(/;?\s*$/, '')};`);
  }

  src = lines.join('\n');
  if (src !== before) {
    fs.writeFileSync(file, src);
    fixed.push(path.relative(ROOT, file).replace(/\\/g, '/'));
  }
}

console.log('Reordered imports in', fixed.length, 'files');
fixed.forEach((f) => console.log(' -', f));
