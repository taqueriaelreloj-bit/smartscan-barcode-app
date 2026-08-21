import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(path.join(root, file), 'utf8');

const [html, app, serviceWorker, manifestSource] = await Promise.all([
  read('index.html'),
  read('src/app.js'),
  read('sw.js'),
  read('manifest.webmanifest'),
]);

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert.deepEqual(duplicateIds, [], `Duplicate HTML ids: ${duplicateIds.join(', ')}`);

const queriedIds = [...app.matchAll(/\$\('#([^']+)'\)/g)].map((match) => match[1]);
const missingIds = [...new Set(queriedIds.filter((id) => !ids.includes(id)))];
assert.deepEqual(missingIds, [], `JavaScript selectors missing from HTML: ${missingIds.join(', ')}`);

const symbols = [...html.matchAll(/<symbol id="(icon-[^"]+)"/g)].map((match) => match[1]);
const iconUses = [...html.matchAll(/href="#(icon-[^"]+)"/g)].map((match) => match[1]);
const dynamicIcons = ['flash', 'activity', 'scan', 'plus', 'edit', 'layers', 'trash', 'upload'];
const missingIcons = [...new Set([
  ...iconUses.filter((id) => !symbols.includes(id)),
  ...dynamicIcons.map((name) => `icon-${name}`).filter((id) => !symbols.includes(id)),
])];
assert.deepEqual(missingIcons, [], `SVG symbols missing from the sprite: ${missingIcons.join(', ')}`);

const shellPaths = [...serviceWorker.matchAll(/'\.\/([^']*)'/g)]
  .map((match) => match[1] || 'index.html');
const missingShellFiles = [];
for (const file of shellPaths) {
  try {
    await access(path.join(root, file));
  } catch {
    missingShellFiles.push(file);
  }
}
assert.deepEqual(missingShellFiles, [], `Service worker references missing files: ${missingShellFiles.join(', ')}`);

const manifest = JSON.parse(manifestSource);
assert.equal(manifest.name, 'SmartScan Pro');
assert.equal(manifest.start_url, './');
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.icons?.some((icon) => icon.src === 'assets/icon.svg'));
assert.match(html, /<script type="module" src="src\/app\.js"><\/script>/);
assert.match(html, /<link rel="manifest" href="manifest\.webmanifest" \/>/);

console.log(`App shell verified: ${ids.length} ids, ${symbols.length} SVG symbols, ${shellPaths.length} offline resources.`);
