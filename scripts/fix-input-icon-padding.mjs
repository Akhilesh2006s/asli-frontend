import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (p.endsWith('.tsx')) files.push(p);
  }
  return files;
}

function fixClassName(value) {
  if (!value.includes('pl-')) return value;
  if (value.includes('px-0')) return value;
  let v = value;
  if (/\bpl-10\b/.test(v)) {
    v = v.replace(/\bpl-10\b/, 'px-0 pl-10 sm:pl-11');
  } else if (/\bpl-12\b/.test(v)) {
    v = v.replace(/\bpl-12\b/, 'px-0 pl-12 sm:pl-12');
  } else if (/\bpl-9\b/.test(v)) {
    v = v.replace(/\bpl-9\b/, 'px-0 pl-9 sm:pl-10');
  }
  return v;
}

let n = 0;
for (const file of walk(SRC)) {
  let c = fs.readFileSync(file, 'utf8');
  const o = c;
  // className="...pl-10..."
  c = c.replace(/className="([^"]*)"/g, (_, cls) => `className="${fixClassName(cls)}"`);
  c = c.replace(/className=\{`([^`]*?)`\}/g, (_, cls) => `className={\`${fixClassName(cls)}\`}`);
  if (c !== o) {
    fs.writeFileSync(file, c);
    n++;
    console.log(path.relative(SRC, file));
  }
}
console.log(`Updated ${n} files`);
