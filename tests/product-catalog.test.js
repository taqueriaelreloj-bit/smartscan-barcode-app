import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupProduct } from '../src/product-catalog.js';

test('maps Open Food Facts product fields', async () => {
  let requestedUrl = '';
  const product = await lookupProduct('3017624010701', {
    fetchImpl: async (url) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          product: {
            product_name: 'Hazelnut spread',
            brands: 'Example Brand, Other',
            categories: 'Spreads, Breakfasts',
            nutriscore_grade: 'd',
            allergens_tags: ['en:milk', 'en:nuts'],
            ingredients_text: 'Sugar, hazelnuts',
            nutriments: { sugars_100g: 52 },
            last_modified_t: 1_700_000_000,
          },
        }),
      };
    },
  });

  assert.match(requestedUrl, /\/api\/v3\/product\/3017624010701\.json/);
  assert.equal(product.name, 'Hazelnut spread');
  assert.equal(product.brand, 'Example Brand');
  assert.equal(product.category, 'Spreads');
  assert.equal(product.nutritionGrade, 'd');
  assert.deepEqual(product.allergens, ['milk', 'nuts']);
});

test('returns null for invalid or missing products', async () => {
  assert.equal(await lookupProduct('abc'), null);
  assert.equal(await lookupProduct('123456', {
    fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({}) }),
  }), null);
});

