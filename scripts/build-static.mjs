import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const files = ['index.html', 'styles.css', 'manifest.webmanifest', 'sw.js'];
const directories = ['assets', 'src'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of files) {
  await cp(path.join(root, file), path.join(output, file));
}

for (const directory of directories) {
  await cp(path.join(root, directory), path.join(output, directory), { recursive: true });
}

const requiredOutput = [
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'sw.js',
  'assets/icon.svg',
  'src/app.js',
  'src/hardware-scanner.js',
  'src/inventory.js',
  'src/product-catalog.js',
  'src/result-actions.js',
  'src/scanner.js',
  'src/storage.js',
];

let totalBytes = 0;
for (const file of requiredOutput) {
  const details = await stat(path.join(output, file));
  if (!details.isFile()) throw new Error(`Deployment output is missing ${file}`);
  totalBytes += details.size;
}

console.log(`Built ${requiredOutput.length} deployment files (${Math.ceil(totalBytes / 1024)} KB) in dist/.`);
