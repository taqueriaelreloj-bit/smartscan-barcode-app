import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adjustItemQuantity,
  createInventoryItem,
  filterInventory,
  getItemState,
  inventoryToCsv,
  normalizeBarcode,
  summarizeInventory,
  upsertInventoryItem,
} from '../src/inventory.js';

const now = new Date('2026-08-20T12:00:00-05:00');

test('normalizes barcode whitespace', () => {
  assert.equal(normalizeBarcode('  0123 456  '), '0123456');
});

test('creates a sanitized inventory item', () => {
  const item = createInventoryItem({
    barcode: ' 123 456 ',
    name: '  Drill  ',
    quantity: -4,
    unitCost: '39.999',
    allergens: ['en:milk', 'milk', '  nuts '],
  }, now);

  assert.equal(item.barcode, '123456');
  assert.equal(item.name, 'Drill');
  assert.equal(item.quantity, 0);
  assert.equal(item.unitCost, 40);
  assert.deepEqual(item.allergens, ['milk', 'nuts']);
});

test('upserts by barcode without creating duplicates', () => {
  const first = createInventoryItem({ barcode: '111111', name: 'First', quantity: 1 }, now);
  const items = upsertInventoryItem([first], { barcode: '111111', name: 'Updated', quantity: 3 }, new Date('2026-08-21T12:00:00-05:00'));

  assert.equal(items.length, 1);
  assert.equal(items[0].id, first.id);
  assert.equal(items[0].name, 'Updated');
  assert.equal(items[0].quantity, 3);
  assert.notEqual(items[0].updatedAt, first.updatedAt);
});

test('quantity adjustments never go below zero', () => {
  const item = createInventoryItem({ barcode: '222222', name: 'Item', quantity: 2 }, now);
  const items = adjustItemQuantity([item], item.id, -10, now);
  assert.equal(items[0].quantity, 0);
});

test('calculates inventory totals and unique alerts', () => {
  const items = [
    createInventoryItem({ barcode: '1', name: 'Low', quantity: 1, minStock: 2, unitCost: 4 }, now),
    createInventoryItem({ barcode: '2', name: 'Normal', quantity: 3, minStock: 1, unitCost: 2.5 }, now),
  ];
  const summary = summarizeInventory(items, now);
  assert.deepEqual(summary, { skuCount: 2, totalUnits: 4, alertCount: 1, inventoryValue: 11.5 });
});

test('detects expiration and filters food products', () => {
  const expired = createInventoryItem({ barcode: '3', name: 'Milk', category: 'Alimentos', expiresAt: '2026-08-19' }, now);
  const tool = createInventoryItem({ barcode: '4', name: 'Saw', category: 'Herramientas' }, now);
  assert.equal(getItemState(expired, now), 'expired');
  assert.deepEqual(filterInventory([expired, tool], '', 'food', now).map((item) => item.name), ['Milk']);
});

test('escapes spreadsheet values in CSV output', () => {
  const item = createInventoryItem({ barcode: '5', name: 'Tape, "Pro"', quantity: 1 }, now);
  const csv = inventoryToCsv([item]);
  assert.match(csv, /"Tape, ""Pro"""/);
});

