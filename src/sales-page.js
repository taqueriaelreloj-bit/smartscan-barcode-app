import { adjustItemQuantity, findItemByBarcode, normalizeBarcode } from './inventory.js';
import { HardwareScannerInput } from './hardware-scanner.js';
import { BarcodeCamera } from './scanner.js';
import { SmartScanStore } from './storage.js';
import { addToCart, calculateSale, completeSale, createCart, getSales, removeFromCart, summarizeSales, updateCartPrice, updateCartQuantity } from './sales.js';

const $ = (selector) => document.querySelector(selector);
const store = new SmartScanStore();
let items = store.getItems();
let cart = createCart();
let lastSale = null;

const elements = {
  code: $('#sale-code'), addCode: $('#add-code'), status: $('#sale-status'), scannerBox: $('#scanner-box'),
  video: $('#sale-video'), openCamera: $('#open-camera'), stopCamera: $('#stop-camera'), cartList: $('#cart-list'),
  taxRate: $('#tax-rate'), discount: $('#discount'), subtotal: $('#subtotal'), discountTotal: $('#discount-total'),
  taxTotal: $('#tax-total'), grandTotal: $('#grand-total'), paymentMethod: $('#payment-method'),
  completeSale: $('#complete-sale'), clearCart: $('#clear-cart'), todayCount: $('#today-count'), todayTotal: $('#today-total'),
  todayProfit: $('#today-profit'), monthTotal: $('#month-total'), salesHistory: $('#sales-history'),
  receiptCard: $('#receipt-card'), receiptMeta: $('#receipt-meta'), receiptLines: $('#receipt-lines'), receiptSubtotal: $('#receipt-subtotal'),
  receiptDiscount: $('#receipt-discount'), receiptTax: $('#receipt-tax'), receiptTotal: $('#receipt-total'), printReceipt: $('#print-receipt'),
};

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

function setStatus(message, tone = '') {
  elements.status.textContent = message;
  elements.status.className = `status${tone ? ` ${tone}` : ''}`;
}

function getOptions() {
  return { taxRate: Number(elements.taxRate.value || 0), discount: Number(elements.discount.value || 0), paymentMethod: elements.paymentMethod.value };
}

function getAvailableQuantity(itemId) {
  const item = items.find((candidate) => candidate.id === itemId);
  return Math.max(0, Number(item?.quantity || 0));
}

function rememberSalePrice(itemId, value) {
  const salePrice = Math.round(Math.max(0, Number(value) || 0) * 100) / 100;
  items = store.getItems().map((item) => item.id === itemId ? { ...item, salePrice } : item);
  items = store.saveItems(items);
  return salePrice;
}

function validateCartStock() {
  items = store.getItems();
  for (const line of cart) {
    const item = items.find((candidate) => candidate.id === line.itemId);
    if (!item) return `${line.name} ya no existe en el inventario.`;
    const available = Math.max(0, Number(item.quantity || 0));
    if (Number(line.quantity || 0) > available) return `${line.name}: solo hay ${available} disponibles.`;
  }
  return '';
}

function renderCart() {
  items = store.getItems();
  elements.cartList.replaceChildren();
  if (!cart.length) {
    const empty = document.createElement('div');
    empty.className = 'cart-empty';
    empty.textContent = 'Escanea un producto para comenzar la venta.';
    elements.cartList.append(empty);
  }
  for (const line of cart) {
    const row = document.createElement('div');
    row.className = 'cart-line';
    const info = document.createElement('div');
    info.innerHTML = `<strong></strong><small></small>`;
    info.querySelector('strong').textContent = line.name;
    const available = getAvailableQuantity(line.itemId);
    info.querySelector('small').textContent = `${line.barcode || 'Sin código'} · Disponible: ${available}`;

    const quantity = document.createElement('input');
    quantity.type = 'number'; quantity.min = '1'; quantity.max = String(Math.max(1, available)); quantity.step = '1'; quantity.value = String(line.quantity); quantity.setAttribute('aria-label', `Cantidad de ${line.name}`);
    quantity.addEventListener('change', () => {
      const requested = Math.max(1, Number(quantity.value || 1));
      if (requested > available) {
        quantity.value = String(available || 1);
        setStatus(`${line.name}: solo hay ${available} disponibles.`, 'error');
        return;
      }
      cart = updateCartQuantity(cart, line.itemId, requested);
      renderCart();
    });

    const price = document.createElement('input');
    price.type = 'number'; price.min = '0'; price.step = '0.01'; price.value = Number(line.price || 0).toFixed(2); price.setAttribute('aria-label', `Precio de ${line.name}`);
    price.addEventListener('change', () => {
      const savedPrice = rememberSalePrice(line.itemId, price.value);
      cart = updateCartPrice(cart, line.itemId, savedPrice);
      setStatus(`${line.name}: precio de venta guardado en ${money(savedPrice)}.`, 'good');
      renderCart();
    });

    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'sale-button sale-button-danger remove-sale-line'; remove.textContent = 'Quitar';
    remove.addEventListener('click', () => { cart = removeFromCart(cart, line.itemId); renderCart(); });
    row.append(info, quantity, price, remove);
    elements.cartList.append(row);
  }
  const totals = calculateSale(cart, getOptions());
  elements.subtotal.textContent = money(totals.subtotal);
  elements.discountTotal.textContent = `-${money(totals.discount)}`;
  elements.taxTotal.textContent = money(totals.tax);
  elements.grandTotal.textContent = money(totals.total);
  elements.completeSale.disabled = cart.length === 0;
}

function renderReceipt(sale) {
  if (!sale) {
    elements.receiptCard.hidden = true;
    return;
  }
  lastSale = sale;
  elements.receiptCard.hidden = false;
  const date = new Intl.DateTimeFormat('es-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(sale.createdAt));
  const shortId = String(sale.id || '').slice(-8).toUpperCase();
  elements.receiptMeta.textContent = `${date} · Venta ${shortId || 'local'} · ${sale.paymentMethod}`;
  elements.receiptLines.replaceChildren();
  for (const line of sale.items) {
    const row = document.createElement('div');
    row.className = 'receipt-line';
    const label = document.createElement('span');
    label.textContent = `${line.quantity} × ${line.name}`;
    const amount = document.createElement('strong');
    amount.textContent = money(Number(line.price || 0) * Number(line.quantity || 0));
    row.append(label, amount);
    elements.receiptLines.append(row);
  }
  elements.receiptSubtotal.textContent = money(sale.subtotal);
  elements.receiptDiscount.textContent = `-${money(sale.discount)}`;
  elements.receiptTax.textContent = money(sale.tax);
  elements.receiptTotal.textContent = money(sale.total);
}

function renderSummary() {
  const summary = summarizeSales();
  elements.todayCount.textContent = String(summary.todayCount);
  elements.todayTotal.textContent = money(summary.todayTotal);
  elements.todayProfit.textContent = money(summary.todayProfit);
  elements.monthTotal.textContent = money(summary.monthTotal);
  const sales = getSales().slice(0, 6);
  elements.salesHistory.replaceChildren();
  if (!sales.length) {
    const empty = document.createElement('p'); empty.className = 'status'; empty.textContent = 'Todavía no hay ventas guardadas.'; elements.salesHistory.append(empty); return;
  }
  for (const sale of sales) {
    const row = document.createElement('div'); row.className = 'history-item';
    const info = document.createElement('div');
    const strong = document.createElement('strong'); strong.textContent = money(sale.total);
    const small = document.createElement('small'); small.textContent = `${sale.items.reduce((n, line) => n + Number(line.quantity || 0), 0)} artículos · ${sale.paymentMethod}`;
    info.append(strong, small);
    const actions = document.createElement('div');
    const date = document.createElement('small'); date.textContent = new Intl.DateTimeFormat('es-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(sale.createdAt));
    const view = document.createElement('button');
    view.type = 'button'; view.className = 'sale-button sale-button-secondary'; view.style.minHeight = '34px'; view.style.padding = '0 10px'; view.textContent = 'Recibo';
    view.addEventListener('click', () => { renderReceipt(sale); elements.receiptCard.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    actions.append(date, view);
    row.append(info, actions); elements.salesHistory.append(row);
  }
}

function addBarcode(value) {
  const barcode = normalizeBarcode(value);
  if (!barcode) return setStatus('Escribe o escanea un código válido.', 'error');
  items = store.getItems();
  const item = findItemByBarcode(items, barcode);
  if (!item) {
    setStatus(`El código ${barcode} no está en el inventario. Agrégalo primero en SmartScan.`, 'error');
    return;
  }
  if (item.trackingType === 'asset') return setStatus('Las herramientas/activos no se pueden vender desde el POS.', 'error');
  const available = Math.max(0, Number(item.quantity || 0));
  const alreadyInCart = cart.find((line) => line.itemId === item.id)?.quantity || 0;
  if (available <= alreadyInCart) return setStatus(`${item.name}: no quedan más unidades disponibles.`, 'error');
  cart = addToCart(cart, item, 1);
  elements.code.value = '';
  setStatus(`${item.name} agregado a la venta.`, 'good');
  renderCart();
}

const scanner = new BarcodeCamera(elements.video, {
  onDetected: ({ value }) => {
    addBarcode(value);
    scanner.stop();
    elements.scannerBox.hidden = true;
    elements.openCamera.hidden = false;
  },
  onError: () => setStatus('No se pudo leer ese código. Intenta otra vez.', 'error'),
});

const hardwareScanner = new HardwareScannerInput({ onScan: ({ value }) => addBarcode(value) });
hardwareScanner.attach(document);

elements.addCode.addEventListener('click', () => addBarcode(elements.code.value));
elements.code.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); addBarcode(elements.code.value); } });
elements.openCamera.addEventListener('click', async () => {
  try {
    elements.scannerBox.hidden = false; elements.openCamera.hidden = true; setStatus('Buscando código…'); await scanner.start();
  } catch (error) {
    elements.scannerBox.hidden = true; elements.openCamera.hidden = false; setStatus(error.message || 'No se pudo abrir la cámara.', 'error');
  }
});
elements.stopCamera.addEventListener('click', () => { scanner.stop(); elements.scannerBox.hidden = true; elements.openCamera.hidden = false; });
elements.taxRate.addEventListener('input', renderCart);
elements.discount.addEventListener('input', renderCart);
elements.clearCart.addEventListener('click', () => { cart = createCart(); setStatus('Carrito vacío.'); renderCart(); });
elements.printReceipt.addEventListener('click', () => { if (lastSale) window.print(); });
elements.completeSale.addEventListener('click', () => {
  try {
    const stockError = validateCartStock();
    if (stockError) return setStatus(stockError, 'error');

    const soldLines = cart.map((line) => ({ ...line }));
    const sale = completeSale(cart, getOptions());
    for (const line of soldLines) items = adjustItemQuantity(items, line.itemId, -Number(line.quantity || 0));
    items = store.saveItems(items);
    store.addActivity({
      type: 'sale',
      title: `Venta: ${money(sale.total)}`,
      detail: `${soldLines.reduce((sum, line) => sum + Number(line.quantity || 0), 0)} artículos · ${sale.paymentMethod}`,
    });

    cart = createCart();
    setStatus(`Venta completada por ${money(sale.total)}. Inventario actualizado.`, 'good');
    renderCart(); renderSummary(); renderReceipt(sale);
    elements.receiptCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { setStatus(error.message || 'No se pudo completar la venta.', 'error'); }
});

window.addEventListener('beforeunload', () => scanner.stop());
renderCart();
renderSummary();
elements.code.focus();
