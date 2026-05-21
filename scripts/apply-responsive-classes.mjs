/**
 * Batch-apply mobile-first responsive Tailwind class upgrades.
 * Skips: lib/, hooks/, contexts/, types/, App.tsx
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

const SKIP_DIRS = ['lib', 'hooks', 'contexts', 'types'];
const SKIP_FILES = ['App.tsx'];

function replaceToken(content, from, to) {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<!(?:xs|sm|md|lg|xl|2xl):)${escaped}(?![\\w-])`, 'g');
  return content.replace(re, to);
}

const TYPOGRAPHY = [
  ['text-6xl', 'text-3xl sm:text-5xl lg:text-6xl'],
  ['text-5xl', 'text-3xl sm:text-4xl lg:text-5xl'],
  ['text-4xl', 'text-2xl sm:text-3xl lg:text-4xl'],
  ['text-3xl', 'text-2xl sm:text-3xl'],
  ['text-2xl', 'text-xl sm:text-2xl'],
  ['text-xl', 'text-lg sm:text-xl'],
  ['text-lg', 'text-base sm:text-lg'],
  ['text-base', 'text-sm sm:text-base'],
  ['text-sm', 'text-xs sm:text-sm'],
];

const SPACING_AND_GRID = [
  ['p-8', 'p-4 sm:p-6 lg:p-8'],
  ['p-6', 'p-3 sm:p-4 lg:p-6'],
  ['px-8', 'px-4 sm:px-6 lg:px-8'],
  ['px-6', 'px-3 sm:px-4 lg:px-6'],
  ['py-8', 'py-4 sm:py-6 lg:py-8'],
  ['py-6', 'py-3 sm:py-4 lg:py-6'],
  ['m-6', 'm-3 sm:m-4 lg:m-6'],
  ['gap-8', 'gap-4 sm:gap-6 lg:gap-8'],
  ['gap-6', 'gap-3 sm:gap-4 lg:gap-6'],
  ['space-y-8', 'space-y-4 sm:space-y-6 lg:space-y-8'],
  ['space-y-6', 'space-y-3 sm:space-y-4 lg:space-y-6'],
  ['grid-cols-6', 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'],
  ['grid-cols-5', 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'],
  ['grid-cols-4', 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'],
  ['grid-cols-3', 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'],
  ['grid-cols-2', 'grid-cols-1 sm:grid-cols-2'],
];

const ICONS = [
  ['w-8 h-8', 'w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8'],
  ['h-8 w-8', 'h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8'],
  ['w-6 h-6', 'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6'],
  ['h-6 w-6', 'h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6'],
  ['w-5 h-5', 'w-4 h-4 sm:w-5 sm:h-5'],
  ['h-5 w-5', 'h-4 w-4 sm:h-5 sm:w-5'],
  ['w-4 h-4', 'w-3 h-3 sm:w-4 sm:h-4'],
  ['h-4 w-4', 'h-3 w-3 sm:h-4 sm:w-4'],
];

function shouldProcess(filePath) {
  const rel = path.relative(SRC, filePath).replace(/\\/g, '/');
  if (SKIP_FILES.some((f) => rel.endsWith(f))) return false;
  if (!rel.endsWith('.tsx') && !rel.endsWith('.ts')) return false;
  if (SKIP_DIRS.some((d) => rel === d || rel.startsWith(`${d}/`))) return false;
  return true;
}

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

function applyTypography(content) {
  const markers = new Map();
  TYPOGRAPHY.forEach(([from], i) => {
    const marker = `__TYPO${i}__`;
    markers.set(marker, TYPOGRAPHY[i][1]);
    content = replaceToken(content, from, marker);
  });
  for (const [marker, to] of markers) {
    content = content.split(marker).join(to);
  }
  return content;
}

function applyReplacements(content, list) {
  for (const [from, to] of list) {
    content = replaceToken(content, from, to);
  }
  return content;
}

let changedFiles = 0;

for (const file of walk(SRC)) {
  if (!shouldProcess(file)) continue;
  const original = fs.readFileSync(file, 'utf8');
  let content = applyTypography(original);
  content = applyReplacements(content, SPACING_AND_GRID);
  content = applyReplacements(content, ICONS);

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log(`Updated: ${path.relative(SRC, file)}`);
  }
}

console.log(`\nDone: ${changedFiles} files updated.`);
