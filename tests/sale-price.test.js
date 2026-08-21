import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryItem, inventoryToCsv } from '../src/inventory.js';
import { addToCart, createCart } from '../src/sales.js';

const now = new Date('2026-08-21T18:00:00-05:00');

test('inventory preserves a cent-safe sale price', () => {
  const item = createInventoryItem({
    barcode: '123456789',
    name: 'Test product',
    unitCost: 4.25,
    salePrice: 9.999,
    quantity: 5,
  }, now);

  assert.equal(item.unitCost, 4.25);
  assert.equal(item.salePrice, 10);
});

test('POS uses the stored sale price instead of unit cost', () => {
  const item = createInventoryItem({
    id: 'p1',
    barcode: '123456789',
    name: 'Test product',
    unitCost: 4.25,
    salePrice: 10,
    quantity: 5,
  }, now);

  const cart = addToCart(createCart(), item);
  assert.equal(cart[0].price, 10);
  assert.equal(cart[0].cost, 4.25);
});

test('CSV exports sale price next to unit cost', () => {
  const item = createInventoryItem({ barcode: '1', name: 'Product', unitCost: 3, salePrice: 7 }, now);
  const csv = inventoryToCsv([item]);
  assert.match(csv, /"Unit cost","Sale price"/);
  assert.match(csv, /"3","7"/);
});
