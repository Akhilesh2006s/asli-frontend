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

let nested = 0;
let dups = 0;
let missingImport = 0;
const issues = [];

for (const file of walk(ROOT)) {
  const s = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (/import\s*\{\s*\r?\n\s*import\s*\{/.test(s)) {
    nested++;
    issues.push(`nested: ${rel}`);
  }
  const imports = s.match(/import\s*\{[^}]*\bgetAuthToken\b[^}]*\}\s*from\s*['"]@\/lib\/auth-utils['"]/g) || [];
  if (imports.length > 1) {
    dups++;
    issues.push(`dup: ${rel}`);
  }
  if (/\bgetAuthToken\b/.test(s) && !/from\s*['"]@\/lib\/auth-utils['"]/.test(s) && !rel.endsWith('lib/auth-utils.ts')) {
    missingImport++;
    issues.push(`missing: ${rel}`);
  }
  if (/localStorage\.getItem\(\s*['"](?:authToken|superAdminToken|token)['"]/.test(s)) {
    issues.push(`localStorage: ${rel}`);
  }
}

console.log({ nested, dups, missingImport, issueCount: issues.length });
issues.forEach((i) => console.log(i));
