const SALES_KEY = 'smartscan.sales.v1';

export function createCart() {
  return [];
}

export function addToCart(cart, item, quantity = 1) {
  const qty = Math.max(1, Number(quantity) || 1);
  const price = Math.max(0, Number(item.price ?? item.salePrice ?? item.unitPrice ?? item.unitCost ?? item.cost ?? 0));
  const cost = Math.max(0, Number(item.cost ?? item.unitCost ?? 0));
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
  const safePrice = Math.max(0, Number(price) || 0);
  return cart.map((line) => line.itemId === itemId ? { ...line, price: safePrice } : line);
}

export function removeFromCart(cart, itemId) {
  return cart.filter((line) => line.itemId !== itemId);
}

export function calculateSale(cart, { taxRate = 0, discount = 0 } = {}) {
  const subtotal = cart.reduce((sum, line) => sum + (line.price * line.quantity), 0);
  const safeDiscount = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const taxable = Math.max(0, subtotal - safeDiscount);
  const tax = taxable * (Math.max(0, Number(taxRate) || 0) / 100);
  const total = taxable + tax;
  const cost = cart.reduce((sum, line) => sum + ((Number(line.cost) || 0) * line.quantity), 0);
  return { subtotal, discount: safeDiscount, taxable, tax, total, cost, profit: total - tax - cost };
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
  localStorage.setItem(SALES_KEY, JSON.stringify(sales.slice(0, 5000)));
  return sale;
}

export function getSales() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SALES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function summarizeSales(sales = getSales()) {
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const monthKey = now.toISOString().slice(0, 7);
  const today = sales.filter((sale) => sale.createdAt?.slice(0, 10) === dayKey);
  const month = sales.filter((sale) => sale.createdAt?.slice(0, 7) === monthKey);
  const sum = (rows, field) => rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
  return {
    todayCount: today.length,
    todayTotal: sum(today, 'total'),
    todayProfit: sum(today, 'profit'),
    monthCount: month.length,
    monthTotal: sum(month, 'total'),
    monthProfit: sum(month, 'profit'),
  };
}
