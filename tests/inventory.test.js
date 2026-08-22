import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adjustItemQuantity,
  checkOutAsset,
  createInventoryItem,
  daysUntil,
  filterInventory,
  getItemState,
  inventoryToCsv,
  isAssetOverdue,
  normalizeBarcode,
  returnAsset,
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

test('invalid quantity adjustments do not corrupt inventory', () => {
  const item = createInventoryItem({ barcode: '222223', name: 'Item', quantity: 5 }, now);
  const items = adjustItemQuantity([item], item.id, 'not-a-number', now);
  assert.equal(items[0].quantity, 5);
  assert.equal(Number.isFinite(items[0].quantity), true);
});

test('calculates inventory totals and unique alerts', () => {
  const items = [
    createInventoryItem({ barcode: '1', name: 'Low', quantity: 1, minStock: 2, unitCost: 4 }, now),
    createInventoryItem({ barcode: '2', name: 'Normal', quantity: 3, minStock: 1, unitCost: 2.5 }, now),
  ];
  const summary = summarizeInventory(items, now);
  assert.deepEqual(summary, {
    skuCount: 2,
    totalUnits: 4,
    alertCount: 1,
    inventoryValue: 11.5,
    assetCount: 0,
    checkedOutCount: 0,
  });
});

test('detects expiration and filters food products', () => {
  const expired = createInventoryItem({ barcode: '3', name: 'Milk', category: 'Alimentos', expiresAt: '2026-08-19' }, now);
  const tool = createInventoryItem({ barcode: '4', name: 'Saw', category: 'Herramientas' }, now);
  assert.equal(getItemState(expired, now), 'expired');
  assert.deepEqual(filterInventory([expired, tool], '', 'food', now).map((item) => item.name), ['Milk']);
});

test('compares expiration as calendar dates instead of elapsed hours', () => {
  const midday = new Date(2026, 7, 20, 12, 0, 0);
  assert.equal(daysUntil('2026-08-19', midday), -1);
  assert.equal(daysUntil('2026-08-20', midday), 0);
  assert.equal(daysUntil('2026-08-21', midday), 1);
  assert.equal(daysUntil('2026-02-30', midday), null);
});

test('escapes spreadsheet values in CSV output', () => {
  const item = createInventoryItem({ barcode: '5', name: 'Tape, "Pro"', quantity: 1 }, now);
  const csv = inventoryToCsv([item]);
  assert.match(csv, /"Tape, ""Pro"""/);
});

test('checks a serialized asset out to a worker and job site', () => {
  const drill = createInventoryItem({
    barcode: 'TOOL-001',
    name: 'Hammer drill',
    trackingType: 'asset',
    serialNumber: 'HD-9381',
    location: 'Warehouse',
  }, now);
  const dueAt = '2026-08-22';
  const [checkedOut] = checkOutAsset([drill], drill.id, {
    assignedTo: 'Carlos',
    jobSite: 'Waxahachie addition',
    dueAt,
  }, now);

  assert.equal(checkedOut.assetStatus, 'checked-out');
  assert.equal(checkedOut.assignedTo, 'Carlos');
  assert.equal(checkedOut.jobSite, 'Waxahachie addition');
  assert.equal(checkedOut.dueAt, dueAt);
  assert.equal(checkedOut.checkedOutAt, now.toISOString());
});

test('flags overdue assets and filters field assignments', () => {
  const asset = createInventoryItem({
    barcode: 'TOOL-002',
    name: 'Laser level',
    trackingType: 'asset',
    assetStatus: 'checked-out',
    assignedTo: 'Marcos',
    jobSite: 'Midlothian kitchen',
    dueAt: '2026-08-19',
  }, now);

  assert.equal(isAssetOverdue(asset, now), true);
  assert.equal(getItemState(asset, now), 'overdue');
  assert.deepEqual(filterInventory([asset], 'Midlothian', 'checked-out', now).map((item) => item.name), ['Laser level']);
  assert.deepEqual(filterInventory([asset], '', 'overdue', now).map((item) => item.name), ['Laser level']);
});

test('returns an asset and records its condition and destination', () => {
  const checkedOut = createInventoryItem({
    barcode: 'TOOL-003',
    name: 'Circular saw',
    trackingType: 'asset',
    assetStatus: 'checked-out',
    assignedTo: 'Luis',
    jobSite: 'Red Oak bath',
    dueAt: '2026-08-21',
  }, now);
  const returnedAt = new Date('2026-08-21T16:30:00-05:00');
  const [returned] = returnAsset([checkedOut], checkedOut.id, {
    location: 'Truck 2',
    condition: 'needs-service',
    assetStatus: 'maintenance',
  }, returnedAt);

  assert.equal(returned.assetStatus, 'maintenance');
  assert.equal(returned.condition, 'needs-service');
  assert.equal(returned.location, 'Truck 2');
  assert.equal(returned.assignedTo, '');
  assert.equal(returned.jobSite, '');
  assert.equal(returned.dueAt, '');
  assert.equal(returned.returnedAt, returnedAt.toISOString());
  assert.equal(getItemState(returned, returnedAt), 'service');
});

test('keeps serialized assets at one unit and rejects invalid movement transitions', () => {
  const serviceAsset = createInventoryItem({
    id: 'asset-service',
    name: 'Rotomartillo',
    barcode: 'TOOL-SERVICE',
    trackingType: 'asset',
    assetStatus: 'maintenance',
    quantity: 8,
    minStock: 3,
    expiresAt: '2030-01-01',
  });

  assert.equal(serviceAsset.quantity, 1);
  assert.equal(serviceAsset.minStock, 0);
  assert.equal(serviceAsset.expiresAt, '');
  assert.deepEqual(checkOutAsset([serviceAsset], serviceAsset.id, { assignedTo: 'Luis', jobSite: 'Obra Norte' }), [serviceAsset]);

  const available = createInventoryItem({ ...serviceAsset, assetStatus: 'available' });
  assert.deepEqual(returnAsset([available], available.id, { location: 'Bodega' }), [available]);
});
