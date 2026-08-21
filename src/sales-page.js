import { findItemByBarcode, normalizeBarcode } from './inventory.js';
import { HardwareScannerInput } from './hardware-scanner.js';
import { BarcodeCamera } from './scanner.js';
import { SmartScanStore } from './storage.js';
import { addToCart, calculateSale, completeSale, createCart, getSales, removeFromCart, summarizeSales, updateCartPrice, updateCartQuantity } from './sales.js';

const $ = (selector) => document.querySelector(selector);
const store = new SmartScanStore();
let items = store.getItems();
let cart = createCart();

const elements = {
  code: $('#sale-code'), addCode: $('#add-code'), status: $('#sale-status'), scannerBox: $('#scanner-box'),
  video: $('#sale-video'), openCamera: $('#open-camera'), stopCamera: $('#stop-camera'), cartList: $('#cart-list'),
  taxRate: $('#tax-rate'), discount: $('#discount'), subtotal: $('#subtotal'), discountTotal: $('#discount-total'),
  taxTotal: $('#tax-total'), grandTotal: $('#grand-total'), paymentMethod: $('#payment-method'),
  completeSale: $('#complete-sale'), clearCart: $('#clear-cart'), todayCount: $('#today-count'), todayTotal: $('#today-total'),
  todayProfit: $('#today-profit'), monthTotal: $('#month-total'), salesHistory: $('#sales-history'),
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

function renderCart() {
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
    info.querySelector('small').textContent = line.barcode || 'Sin código';

    const quantity = document.createElement('input');
    quantity.type = 'number'; quantity.min = '1'; quantity.step = '1'; quantity.value = String(line.quantity); quantity.setAttribute('aria-label', `Cantidad de ${line.name}`);
    quantity.addEventListener('change', () => { cart = updateCartQuantity(cart, line.itemId, quantity.value); renderCart(); });

    const price = document.createElement('input');
    price.type = 'number'; price.min = '0'; price.step = '0.01'; price.value = Number(line.price || 0).toFixed(2); price.setAttribute('aria-label', `Precio de ${line.name}`);
    price.addEventListener('change', () => { cart = updateCartPrice(cart, line.itemId, price.value); renderCart(); });

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
    const date = document.createElement('small'); date.textContent = new Intl.DateTimeFormat('es-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(sale.createdAt));
    row.append(info, date); elements.salesHistory.append(row);
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
elements.completeSale.addEventListener('click', () => {
  try {
    const sale = completeSale(cart, getOptions());
    cart = createCart();
    setStatus(`Venta completada por ${money(sale.total)}.`, 'good');
    renderCart(); renderSummary();
  } catch (error) { setStatus(error.message || 'No se pudo completar la venta.', 'error'); }
});

window.addEventListener('beforeunload', () => scanner.stop());
renderCart();
renderSummary();
elements.code.focus();
