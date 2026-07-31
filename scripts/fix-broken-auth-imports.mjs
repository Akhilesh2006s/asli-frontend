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

const broken = [];
const fixed = [];

for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, 'utf8');
  const before = src;

  // Pattern: import {\nimport { getAuthToken } from '...';\n  Rest,
  src = src.replace(
    /import\s*\{\s*\nimport\s*\{\s*getAuthToken\s*\}\s*from\s*['"]@\/lib\/auth-utils['"]\s*;?\s*\n([\s\S]*?)\n\}\s*from\s*(['"][^'"]+['"])\s*;?/g,
    (m, inner, from) => {
      return `import { getAuthToken } from '@/lib/auth-utils';\nimport {\n${inner}\n} from ${from};`;
    },
  );

  // Pattern: import {\nimport { getAuthToken } from '...';\n  X, Y } from '...'
  src = src.replace(
    /import\s*\{\s*\r?\nimport\s*\{\s*getAuthToken\s*\}\s*from\s*['"]@\/lib\/auth-utils['"]\s*;?\r?\n/g,
    "import { getAuthToken } from '@/lib/auth-utils';\nimport {\n",
  );

  if (/import\s*\{\s*\r?\n\s*import\s*\{/.test(src)) {
    broken.push(path.relative(ROOT, file));
  }

  if (src !== before) {
    fs.writeFileSync(file, src);
    fixed.push(path.relative(ROOT, file).replace(/\\/g, '/'));
  }
}

console.log('Fixed:', fixed.length);
fixed.forEach((f) => console.log(' -', f));
console.log('Still broken:', broken.length);
broken.forEach((f) => console.log(' !', f));
