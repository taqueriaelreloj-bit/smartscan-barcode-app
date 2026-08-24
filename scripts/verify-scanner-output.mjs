import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const html = await readFile(path.join(dist, 'index.html'), 'utf8');
const manifest = JSON.parse(await readFile(path.join(dist, 'manifest.webmanifest'), 'utf8'));

assert.equal(manifest.name, 'QR & Barcode Scanner');
assert.match(html, /src\/scanner-app\.js/);
assert.doesNotMatch(html, /sales\.html|Inventario|inventory/i);

for (const required of ['src/scanner-app.js', 'src/scanner.js', 'src/result-actions.js']) {
  await access(path.join(dist, required));
}

for (const excluded of ['sales.html', 'src/app.js', 'src/inventory.js', 'src/sales.js', 'src/sales-page.js']) {
  let exists = true;
  try { await access(path.join(dist, excluded)); } catch { exists = false; }
  assert.equal(exists, false, `Scanner build must exclude ${excluded}`);
}

console.log('Scanner edition verified: no inventory or POS modules in dist/.');
