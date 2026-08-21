import { normalizeBarcode } from './inventory.js';

const API_BASE = 'https://world.openfoodfacts.org';
const PRODUCT_FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'brands',
  'categories',
  'categories_tags',
  'nutriscore_grade',
  'nutrition_grades',
  'allergens_tags',
  'ingredients_text',
  'ingredients_text_en',
  'nutriments',
  'last_modified_t',
];

function firstText(value) {
  return String(value ?? '').split(',').map((part) => part.trim()).find(Boolean) ?? '';
}

function cleanTag(value) {
  return String(value ?? '').replace(/^[a-z]{2}:/i, '').replaceAll('-', ' ').trim();
}

function mapProduct(barcode, product) {
  const grade = String(product.nutriscore_grade ?? product.nutrition_grades ?? '').toLowerCase();
  return {
    barcode,
    name: String(product.product_name ?? product.product_name_en ?? '').trim(),
    brand: firstText(product.brands),
    category: firstText(product.categories) || cleanTag(product.categories_tags?.[0]),
    nutritionGrade: /^[a-e]$/.test(grade) ? grade : '',
    allergens: Array.isArray(product.allergens_tags) ? product.allergens_tags.map(cleanTag).filter(Boolean) : [],
    ingredients: String(product.ingredients_text ?? product.ingredients_text_en ?? '').trim(),
    nutriments: product.nutriments && typeof product.nutriments === 'object' ? product.nutriments : {},
    source: 'Open Food Facts',
    sourceUrl: `${API_BASE}/product/${encodeURIComponent(barcode)}`,
    sourceUpdatedAt: product.last_modified_t ? new Date(Number(product.last_modified_t) * 1000).toISOString() : '',
  };
}

export async function lookupProduct(barcode, options = {}) {
  const normalized = normalizeBarcode(barcode);
  if (!/^\d{6,18}$/.test(normalized)) return null;

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 6500);
  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const endpoint = `${API_BASE}/api/v3/product/${encodeURIComponent(normalized)}.json?fields=${encodeURIComponent(PRODUCT_FIELDS.join(','))}`;
    const response = await fetchImpl(endpoint, {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Product lookup failed (${response.status})`);

    const payload = await response.json();
    const product = payload?.product;
    if (!product || payload.status === 0) return null;
    return mapProduct(normalized, product);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}

