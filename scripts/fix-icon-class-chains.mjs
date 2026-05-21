import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

const FIXES = [
  // Over-chained icon sizes (longest first)
  ['h-3 w-3 sm:h-4 sm:w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8', 'h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8'],
  ['w-3 h-3 sm:w-4 sm:h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8', 'w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8'],
  ['h-3 w-3 sm:h-4 sm:w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6', 'h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6'],
  ['w-3 h-3 sm:w-4 sm:h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6', 'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6'],
  ['h-3 w-3 sm:h-4 sm:w-4 sm:h-5 sm:w-5', 'h-4 w-4 sm:h-5 sm:w-5'],
  ['w-3 h-3 sm:w-4 sm:h-4 sm:w-5 sm:h-5', 'w-4 h-4 sm:w-5 sm:h-5'],
  ['sm:w-5 sm:h-5 lg:w-6 lg:h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8', 'w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8'],
  ['text-xs sm:text-sm sm:text-base lg:text-lg', 'text-sm sm:text-base lg:text-lg'],
  ['text-xs sm:text-sm sm:text-base', 'text-sm sm:text-base'],
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) files.push(p);
  }
  return files;
}

let n = 0;
for (const file of walk(SRC)) {
  let c = fs.readFileSync(file, 'utf8');
  const o = c;
  for (const [from, to] of FIXES) c = c.split(from).join(to);
  if (c !== o) {
    fs.writeFileSync(file, c);
    n++;
    console.log(path.relative(SRC, file));
  }
}
console.log(`Fixed ${n} files`);
