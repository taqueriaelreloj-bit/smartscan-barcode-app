import { createActivity, createInventoryItem } from './inventory.js';

const STORAGE_KEY = 'smartscan-pro:v1';
const SCHEMA_VERSION = 2;
const MAX_ACTIVITY = 500;
const MAX_PRODUCT_CACHE = 250;

function emptyState() {
  return { schemaVersion: SCHEMA_VERSION, items: [], activity: [], productCache: {} };
}

function normalizeState(input) {
  const fallback = emptyState();
  if (!input || typeof input !== 'object') return fallback;

  const items = Array.isArray(input.items)
    ? input.items.filter((item) => item && typeof item === 'object').map((item) => createInventoryItem(item))
    : [];
  const activity = Array.isArray(input.activity)
    ? input.activity.filter((event) => event && typeof event === 'object').map((event) => createActivity(event)).slice(0, MAX_ACTIVITY)
    : [];
  const productCache = input.productCache && typeof input.productCache === 'object' ? input.productCache : {};

  return { schemaVersion: SCHEMA_VERSION, items, activity, productCache };
}

export class SmartScanStore {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.state = this.#read();
  }

  #read() {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : emptyState();
    } catch {
      return emptyState();
    }
  }

  #write() {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  getItems() {
    return structuredClone(this.state.items);
  }

  saveItems(items) {
    this.state.items = items.map((item) => createInventoryItem(item));
    this.#write();
    return this.getItems();
  }

  getActivity() {
    return structuredClone(this.state.activity);
  }

  addActivity(input) {
    const event = createActivity(input);
    this.state.activity = [event, ...this.state.activity].slice(0, MAX_ACTIVITY);
    this.#write();
    return event;
  }

  clearActivity() {
    this.state.activity = [];
    this.#write();
  }

  getCachedProduct(barcode, maxAgeMs = 86_400_000) {
    const entry = this.state.productCache[String(barcode)];
    if (!entry || Date.now() - Number(entry.cachedAt || 0) > maxAgeMs) return null;
    return structuredClone(entry.product);
  }

  cacheProduct(barcode, product) {
    const entries = Object.entries(this.state.productCache);
    if (entries.length >= MAX_PRODUCT_CACHE) {
      entries.sort(([, a], [, b]) => Number(a.cachedAt || 0) - Number(b.cachedAt || 0));
      delete this.state.productCache[entries[0][0]];
    }
    this.state.productCache[String(barcode)] = { product, cachedAt: Date.now() };
    this.#write();
  }

  exportBackup() {
    return JSON.stringify({ ...this.state, exportedAt: new Date().toISOString() }, null, 2);
  }

  importBackup(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
      throw new Error('La copia no tiene el formato esperado.');
    }
    this.state = normalizeState(parsed);
    this.#write();
    return { items: this.getItems(), activity: this.getActivity() };
  }
}
