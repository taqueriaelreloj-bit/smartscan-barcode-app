import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const edition = process.argv[2] || process.env.APP_EDITION || 'pro';
const isScanner = edition === 'scanner';
if (!['scanner', 'pro'].includes(edition)) throw new Error(`Unknown build edition: ${edition}`);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const sharedFiles = ['privacy.html', 'support.html', 'terms.html', 'styles.css', 'manifest.webmanifest'];
for (const file of sharedFiles) await cp(path.join(root, file), path.join(output, file));
await cp(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
await mkdir(path.join(output, 'src'), { recursive: true });

let requiredOutput;
if (isScanner) {
  await cp(path.join(root, 'scanner.html'), path.join(output, 'index.html'));
  for (const file of ['scanner-app.js', 'scanner.js', 'result-actions.js']) {
    await cp(path.join(root, 'src', file), path.join(output, 'src', file));
  }
  requiredOutput = [
    'index.html', 'privacy.html', 'support.html', 'terms.html', 'styles.css', 'manifest.webmanifest',
    'assets/icon.svg', 'src/scanner-app.js', 'src/scanner.js', 'src/result-actions.js',
  ];
} else {
  for (const file of ['index.html', 'sales.html', 'sw.js']) await cp(path.join(root, file), path.join(output, file));
  await cp(path.join(root, 'src'), path.join(output, 'src'), { recursive: true, force: true });
  requiredOutput = [
    'index.html', 'sales.html', 'privacy.html', 'support.html', 'terms.html', 'styles.css', 'manifest.webmanifest', 'sw.js',
    'assets/icon.svg', 'src/app.js', 'src/edition-config.js', 'src/hardware-scanner.js', 'src/inventory.js',
    'src/product-catalog.js', 'src/result-actions.js', 'src/scanner.js', 'src/storage.js', 'src/sales.js', 'src/sales-page.js',
  ];
}

let totalBytes = 0;
for (const file of requiredOutput) {
  const details = await stat(path.join(output, file));
  if (!details.isFile()) throw new Error(`Deployment output is missing ${file}`);
  totalBytes += details.size;
}

console.log(`Built ${edition} edition: ${requiredOutput.length} deployment files (${Math.ceil(totalBytes / 1024)} KB) in dist/.`);
