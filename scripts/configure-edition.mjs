import { readFile, writeFile } from 'node:fs/promises';

const edition = process.argv[2] || process.env.APP_EDITION || 'pro';
const editions = JSON.parse(await readFile(new URL('../editions.json', import.meta.url), 'utf8'));
const selected = editions[edition];
if (!selected) throw new Error(`Unknown edition: ${edition}. Use scanner or pro.`);

const capacitorPath = new URL('../capacitor.config.json', import.meta.url);
const capacitor = JSON.parse(await readFile(capacitorPath, 'utf8'));
capacitor.appId = selected.appId;
capacitor.appName = selected.appName;
await writeFile(capacitorPath, `${JSON.stringify(capacitor, null, 2)}\n`);

const manifestPath = new URL('../manifest.webmanifest', import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.name = selected.appName;
manifest.short_name = edition === 'scanner' ? 'QR Scanner' : 'Barcode POS';
manifest.description = edition === 'scanner'
  ? 'Fast QR and barcode scanner by ProServices.'
  : 'Scan barcodes, control inventory and record sales with ProServices.';
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const config = {
  edition,
  developer: selected.developer,
  appName: selected.appName,
  appId: selected.appId,
  priceUsd: selected.priceUsd,
  features: selected.features,
  isPro: edition === 'pro',
};
await writeFile(new URL('../src/edition-config.js', import.meta.url), `export const EDITION = ${JSON.stringify(config, null, 2)};\n`);

console.log(`Configured ${edition}: ${selected.appName} (${selected.appId})`);
