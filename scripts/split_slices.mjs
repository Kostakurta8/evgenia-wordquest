import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const words = JSON.parse(fs.readFileSync(path.join(root, 'data', 'words_raw.json'), 'utf8'));

const SIZE = 50;
const inDir = path.join(root, 'data', 'enrichment', 'input');
fs.mkdirSync(inDir, { recursive: true });

let n = 0;
for (let i = 0; i < words.length; i += SIZE) {
  n++;
  const slice = words.slice(i, i + SIZE);
  const name = `slice_${String(n).padStart(2, '0')}.json`;
  fs.writeFileSync(path.join(inDir, name), JSON.stringify(slice, null, 1), 'utf8');
}
console.log('slices', n, 'words', words.length);
