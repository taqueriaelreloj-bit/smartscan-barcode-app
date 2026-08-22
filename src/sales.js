const SALES_KEY = 'smartscan.sales.v1';

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function saleLocalDate(sale) {
  const date = new Date(sale?.createdAt || '');
  return Number.isNaN(date.getTime()) ? null : date;
}

function saveSales(sales) {
  try {
    localStorage.setItem(SALES_KEY, JSON.stringify(sales.slice(0, 5000)));
  } catch (error) {
    throw new Error('No se pudieron guardar las ventas en este dispositivo. Libera espacio e inténtalo de nuevo.', { cause: error });
  }
}

export function createCart() {
  return [];
}

export function addToCart(cart, item, quantity = 1) {
  const qty = Math.max(1, Number(quantity) || 1);
  const price = roundMoney(Math.max(0, Number(item.price ?? item.salePrice ?? item.unitPrice ?? item.unitCost ?? item.cost ?? 0)));
  const cost = roundMoney(Math.max(0, Number(item.cost ?? item.unitCost ?? 0)));
  const existing = cart.find((line) => line.itemId === item.id);
  if (existing) {
    return cart.map((line) => line.itemId === item.id ? { ...line, quantity: line.quantity + qty } : line);
  }
  return [...cart, {
    itemId: item.id,
    barcode: item.barcode || '',
    name: item.name || 'Producto',
    price,
    cost,
    quantity: qty,
  }];
}

export function updateCartQuantity(cart, itemId, quantity) {
  const qty = Math.max(0, Number(quantity) || 0);
  if (!qty) return cart.filter((line) => line.itemId !== itemId);
  return cart.map((line) => line.itemId === itemId ? { ...line, quantity: qty } : line);
}

export function updateCartPrice(cart, itemId, price) {
  const safePrice = roundMoney(Math.max(0, Number(price) || 0));
  return cart.map((line) => line.itemId === itemId ? { ...line, price: safePrice } : line);
}

export function removeFromCart(cart, itemId) {
  return cart.filter((line) => line.itemId !== itemId);
}

export function calculateSale(cart, { taxRate = 0, discount = 0 } = {}) {
  const subtotal = roundMoney(cart.reduce((sum, line) => sum + (line.price * line.quantity), 0));
  const safeDiscount = roundMoney(Math.min(subtotal, Math.max(0, Number(discount) || 0)));
  const taxable = roundMoney(Math.max(0, subtotal - safeDiscount));
  const tax = roundMoney(taxable * (Math.max(0, Number(taxRate) || 0) / 100));
  const total = roundMoney(taxable + tax);
  const cost = roundMoney(cart.reduce((sum, line) => sum + ((Number(line.cost) || 0) * line.quantity), 0));
  const profit = roundMoney(taxable - cost);
  return { subtotal, discount: safeDiscount, taxable, tax, total, cost, profit };
}

export function completeSale(cart, options = {}) {
  if (!cart.length) throw new Error('El carrito está vacío.');
  const totals = calculateSale(cart, options);
  const sale = {
    id: crypto.randomUUID?.() || `sale-${Date.now()}`,
    createdAt: new Date().toISOString(),
    paymentMethod: options.paymentMethod || 'other',
    items: cart.map((line) => ({ ...line })),
    ...totals,
  };
  const sales = getSales();
  sales.unshift(sale);
  saveSales(sales);
  return sale;
}

export function removeSale(saleId) {
  const id = String(saleId || '');
  if (!id) return false;
  const sales = getSales();
  const filtered = sales.filter((sale) => String(sale.id || '') !== id);
  if (filtered.length === sales.length) return false;
  saveSales(filtered);
  return true;
}

export function getSales() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SALES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function summarizeSales(sales = getSales(), now = new Date()) {
  const dayKey = localDayKey(now);
  const monthKey = localMonthKey(now);
  const today = sales.filter((sale) => {
    const date = saleLocalDate(sale);
    return date && localDayKey(date) === dayKey;
  });
  const month = sales.filter((sale) => {
    const date = saleLocalDate(sale);
    return date && localMonthKey(date) === monthKey;
  });
  const sum = (rows, field) => roundMoney(rows.reduce((total, row) => total + (Number(row[field]) || 0), 0));
  return {
    todayCount: today.length,
    todayTotal: sum(today, 'total'),
    todayProfit: sum(today, 'profit'),
    monthCount: month.length,
    monthTotal: sum(month, 'total'),
    monthProfit: sum(month, 'profit'),
  };
}
