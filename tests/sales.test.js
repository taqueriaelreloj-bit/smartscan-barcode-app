import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addToCart,
  calculateSale,
  createCart,
  removeFromCart,
  summarizeSales,
  updateCartPrice,
  updateCartQuantity,
} from '../src/sales.js';

test('adds a product and increments quantity on repeated scans', () => {
  const item = { id: 'p1', barcode: '123', name: 'Test product', unitCost: 4, salePrice: 10 };
  let cart = createCart();
  cart = addToCart(cart, item);
  cart = addToCart(cart, item);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 2);
  assert.equal(cart[0].price, 10);
  assert.equal(cart[0].cost, 4);
});

test('updates quantity and removes a line when quantity becomes zero', () => {
  const item = { id: 'p1', name: 'Product', unitCost: 2, salePrice: 5 };
  let cart = addToCart(createCart(), item);
  cart = updateCartQuantity(cart, 'p1', 3);
  assert.equal(cart[0].quantity, 3);
  cart = updateCartQuantity(cart, 'p1', 0);
  assert.equal(cart.length, 0);
});

test('updates sale price without changing product cost', () => {
  const item = { id: 'p1', name: 'Product', unitCost: 7, salePrice: 12 };
  let cart = addToCart(createCart(), item);
  cart = updateCartPrice(cart, 'p1', 15.5);
  assert.equal(cart[0].price, 15.5);
  assert.equal(cart[0].cost, 7);
});

test('calculates subtotal, discount, tax, total and profit', () => {
  const cart = [
    { itemId: 'a', price: 10, cost: 4, quantity: 2 },
    { itemId: 'b', price: 5, cost: 2, quantity: 1 },
  ];
  const totals = calculateSale(cart, { taxRate: 8.25, discount: 5 });
  assert.equal(totals.subtotal, 25);
  assert.equal(totals.discount, 5);
  assert.equal(totals.taxable, 20);
  assert.equal(totals.tax, 1.65);
  assert.equal(totals.total, 21.65);
  assert.equal(totals.cost, 10);
  assert.equal(totals.profit, 10);
});

test('caps discount at subtotal and never produces a negative total', () => {
  const cart = [{ itemId: 'a', price: 10, cost: 3, quantity: 1 }];
  const totals = calculateSale(cart, { taxRate: 8.25, discount: 50 });
  assert.equal(totals.discount, 10);
  assert.equal(totals.taxable, 0);
  assert.equal(totals.tax, 0);
  assert.equal(totals.total, 0);
});

test('removes a selected product from the cart', () => {
  let cart = createCart();
  cart = addToCart(cart, { id: 'a', name: 'A', salePrice: 1 });
  cart = addToCart(cart, { id: 'b', name: 'B', salePrice: 2 });
  cart = removeFromCart(cart, 'a');
  assert.deepEqual(cart.map((line) => line.itemId), ['b']);
});

test('summarizes sales using the device local calendar date', () => {
  const now = new Date(2026, 7, 22, 0, 15, 0);
  const sameLocalDay = new Date(2026, 7, 22, 0, 5, 0).toISOString();
  const previousLocalDay = new Date(2026, 7, 21, 23, 55, 0).toISOString();
  const sales = [
    { createdAt: sameLocalDay, total: 25, profit: 10 },
    { createdAt: previousLocalDay, total: 40, profit: 12 },
  ];
  const summary = summarizeSales(sales, now);
  assert.equal(summary.todayCount, 1);
  assert.equal(summary.todayTotal, 25);
  assert.equal(summary.todayProfit, 10);
  assert.equal(summary.monthCount, 2);
});

test('ignores sales with invalid dates in summaries', () => {
  const now = new Date(2026, 7, 22, 12, 0, 0);
  const summary = summarizeSales([{ createdAt: 'not-a-date', total: 99, profit: 50 }], now);
  assert.equal(summary.todayCount, 0);
  assert.equal(summary.monthCount, 0);
});
