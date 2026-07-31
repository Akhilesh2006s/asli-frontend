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

const hits = [];
for (const file of walk(ROOT)) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // import type { or import { on its own line, next non-empty is another import
    if (/^import\s+(type\s+)?\{\s*$/.test(line.trim()) || /^import\s+(type\s+)?\{\s*$/.test(line)) {
      const next = lines[i + 1]?.trim() || '';
      if (next.startsWith('import ')) {
        hits.push(`${path.relative(ROOT, file).replace(/\\/g, '/')}:${i + 1}`);
      }
    }
  }
}
console.log(hits.length ? hits.join('\n') : 'clean');
