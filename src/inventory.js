const DEFAULT_CURRENCY = 'USD';

function cleanText(value, maxLength = 500) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function nonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function makeId(prefix = 'item') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function normalizeBarcode(value) {
  return cleanText(value, 180).replace(/\s+/g, '');
}

export function normalizeAllergens(value) {
  const source = Array.isArray(value) ? value : String(value ?? '').split(',');
  return [...new Set(source.map((item) => cleanText(item.replace(/^[a-z]{2}:/i, ''), 80)).filter(Boolean))];
}

export function createInventoryItem(input, now = new Date()) {
  const timestamp = now.toISOString();
  const createdAt = cleanText(input.createdAt, 40) || timestamp;

  return {
    id: cleanText(input.id, 100) || makeId(),
    barcode: normalizeBarcode(input.barcode),
    barcodeFormat: cleanText(input.barcodeFormat, 40),
    name: cleanText(input.name, 120) || 'Producto sin nombre',
    brand: cleanText(input.brand, 80),
    category: cleanText(input.category, 80),
    quantity: Math.round(nonNegativeNumber(input.quantity, 1)),
    minStock: Math.round(nonNegativeNumber(input.minStock, 0)),
    unitCost: Math.round(nonNegativeNumber(input.unitCost, 0) * 100) / 100,
    currency: cleanText(input.currency, 8) || DEFAULT_CURRENCY,
    location: cleanText(input.location, 80),
    expiresAt: /^\d{4}-\d{2}-\d{2}$/.test(String(input.expiresAt ?? '')) ? String(input.expiresAt) : '',
    notes: cleanText(input.notes, 500),
    nutritionGrade: cleanText(input.nutritionGrade, 4).toLowerCase(),
    allergens: normalizeAllergens(input.allergens),
    source: cleanText(input.source, 100),
    createdAt,
    updatedAt: cleanText(input.updatedAt, 40) || timestamp,
  };
}

export function upsertInventoryItem(items, input, now = new Date()) {
  const nextItem = createInventoryItem(input, now);
  const index = items.findIndex((item) => item.id === nextItem.id || (nextItem.barcode && item.barcode === nextItem.barcode));

  if (index === -1) return [nextItem, ...items];

  const existing = items[index];
  const merged = createInventoryItem({ ...existing, ...nextItem, id: existing.id, createdAt: existing.createdAt, updatedAt: '' }, now);
  return items.map((item, itemIndex) => (itemIndex === index ? merged : item));
}

export function adjustItemQuantity(items, id, delta, now = new Date()) {
  return items.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      quantity: Math.max(0, Math.round(nonNegativeNumber(item.quantity) + Number(delta || 0))),
      updatedAt: now.toISOString(),
    };
  });
}

export function removeInventoryItem(items, id) {
  return items.filter((item) => item.id !== id);
}

export function findItemByBarcode(items, barcode) {
  const normalized = normalizeBarcode(barcode);
  return items.find((item) => item.barcode === normalized) ?? null;
}

export function daysUntil(dateString, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString ?? ''));
  if (!match || Number.isNaN(now.getTime())) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const day = Number(dayText);
  const targetDay = new Date(Date.UTC(year, month, day));

  if (
    targetDay.getUTCFullYear() !== year
    || targetDay.getUTCMonth() !== month
    || targetDay.getUTCDate() !== day
  ) return null;

  const currentDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((targetDay.getTime() - currentDay) / 86_400_000);
}

export function getItemState(item, now = new Date()) {
  const remainingDays = daysUntil(item.expiresAt, now);
  if (remainingDays !== null && remainingDays < 0) return 'expired';
  if (item.minStock > 0 && item.quantity <= item.minStock) return 'low-stock';
  if (remainingDays !== null && remainingDays <= 7) return 'expiring';
  return 'ok';
}

export function isFoodItem(item) {
  return /(aliment|comida|bebida|food|grocery|snack|drink)/i.test(`${item.category} ${item.source}`);
}

export function filterInventory(items, query = '', filter = 'all', now = new Date()) {
  const needle = cleanText(query, 180).toLocaleLowerCase();
  return items.filter((item) => {
    const haystack = [item.name, item.brand, item.barcode, item.category, item.location, item.notes]
      .join(' ')
      .toLocaleLowerCase();
    if (needle && !haystack.includes(needle)) return false;

    const state = getItemState(item, now);
    if (filter === 'low-stock') return state === 'low-stock';
    if (filter === 'expiring') return state === 'expiring' || state === 'expired';
    if (filter === 'food') return isFoodItem(item);
    return true;
  });
}

export function summarizeInventory(items, now = new Date()) {
  let totalUnits = 0;
  let inventoryValue = 0;
  const alertedIds = new Set();

  for (const item of items) {
    totalUnits += nonNegativeNumber(item.quantity);
    inventoryValue += nonNegativeNumber(item.quantity) * nonNegativeNumber(item.unitCost);
    if (getItemState(item, now) !== 'ok') alertedIds.add(item.id);
  }

  return {
    skuCount: items.length,
    totalUnits,
    alertCount: alertedIds.size,
    inventoryValue: Math.round(inventoryValue * 100) / 100,
  };
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join('; ') : String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

export function inventoryToCsv(items) {
  const headers = [
    'Barcode', 'Name', 'Brand', 'Category', 'Quantity', 'Minimum stock', 'Unit cost',
    'Currency', 'Location', 'Expiration', 'Nutrition grade', 'Allergens', 'Notes', 'Updated at',
  ];
  const rows = items.map((item) => [
    item.barcode, item.name, item.brand, item.category, item.quantity, item.minStock, item.unitCost,
    item.currency, item.location, item.expiresAt, item.nutritionGrade, item.allergens, item.notes, item.updatedAt,
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function createActivity(input, now = new Date()) {
  return {
    id: cleanText(input.id, 100) || makeId('event'),
    type: cleanText(input.type, 40) || 'update',
    itemId: cleanText(input.itemId, 100),
    barcode: normalizeBarcode(input.barcode),
    title: cleanText(input.title, 140) || 'Actividad de inventario',
    detail: cleanText(input.detail, 220),
    at: cleanText(input.at, 40) || now.toISOString(),
  };
}
