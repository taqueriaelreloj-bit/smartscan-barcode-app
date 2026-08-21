import {
  adjustItemQuantity,
  checkOutAsset,
  createInventoryItem,
  daysUntil,
  filterInventory,
  findItemByBarcode,
  getItemState,
  inventoryToCsv,
  isAssetItem,
  isAssetOverdue,
  normalizeBarcode,
  removeInventoryItem,
  returnAsset,
  summarizeInventory,
  upsertInventoryItem,
} from './inventory.js';
import { HardwareScannerInput } from './hardware-scanner.js';
import { lookupProduct } from './product-catalog.js';
import { classifyCode } from './result-actions.js';
import { BarcodeCamera } from './scanner.js';
import { SmartScanStore } from './storage.js';

const $ = (selector) => document.querySelector(selector);

const elements = {
  networkBanner: $('#network-banner'),
  updateBanner: $('#update-banner'),
  updateButton: $('#update-button'),
  installButton: $('#install-button'),
  scannerSupport: $('#scanner-support'),
  hardwareSupport: $('#hardware-support'),
  startScanButton: $('#start-scan-button'),
  sideScanButton: $('#side-scan-button'),
  mobileScanButton: $('#mobile-scan-button'),
  manualButton: $('#manual-button'),
  imageButton: $('#image-button'),
  imageInput: $('#image-input'),
  scannerPanel: $('#scanner-panel'),
  stopScanButton: $('#stop-scan-button'),
  scannerVideo: $('#scanner-video'),
  cameraMessage: $('#camera-message'),
  batchMode: $('#batch-mode'),
  torchButton: $('#torch-button'),
  zoomControl: $('#zoom-control'),
  zoomRange: $('#zoom-range'),
  latestResult: $('#latest-result'),
  resultAccent: $('#result-accent'),
  resultKicker: $('#result-kicker'),
  resultTitle: $('#result-title'),
  resultSummary: $('#result-summary'),
  resultTags: $('#result-tags'),
  resultAction: $('#result-action'),
  skuCount: $('#sku-count'),
  unitCount: $('#unit-count'),
  catalogContext: $('#catalog-context'),
  unitContext: $('#unit-context'),
  alertCount: $('#alert-count'),
  inventoryValue: $('#inventory-value'),
  inventorySearch: $('#inventory-search'),
  inventoryFilter: $('#inventory-filter'),
  addItemButton: $('#add-item-button'),
  exportCsvButton: $('#export-csv-button'),
  backupButton: $('#backup-button'),
  restoreButton: $('#restore-button'),
  restoreInput: $('#restore-input'),
  inventoryList: $('#inventory-list'),
  emptyState: $('#empty-state'),
  emptyScanButton: $('#empty-scan-button'),
  activityList: $('#activity-list'),
  activityEmpty: $('#activity-empty'),
  clearHistoryButton: $('#clear-history-button'),
  itemDialog: $('#item-dialog'),
  itemForm: $('#item-form'),
  itemDialogTitle: $('#item-dialog-title'),
  itemId: $('#item-id'),
  itemName: $('#item-name'),
  itemBarcode: $('#item-barcode'),
  itemBrand: $('#item-brand'),
  itemCategory: $('#item-category'),
  itemLocation: $('#item-location'),
  itemTrackingType: $('#item-tracking-type'),
  assetFields: $('#asset-fields'),
  itemAssetStatus: $('#item-asset-status'),
  itemSerialNumber: $('#item-serial-number'),
  itemCondition: $('#item-condition'),
  itemQuantity: $('#item-quantity'),
  itemQuantityField: $('#item-quantity-field'),
  itemMinStock: $('#item-min-stock'),
  itemMinStockField: $('#item-min-stock-field'),
  itemCost: $('#item-cost'),
  itemExpiry: $('#item-expiry'),
  itemExpiryField: $('#item-expiry-field'),
  stockSectionTitle: $('#stock-section-title'),
  itemSaveButton: $('#item-save-button'),
  itemNotes: $('#item-notes'),
  itemFormat: $('#item-format'),
  itemNutritionGrade: $('#item-nutrition-grade'),
  itemAllergens: $('#item-allergens'),
  itemSource: $('#item-source'),
  lookupStatus: $('#lookup-status'),
  codeDialog: $('#code-dialog'),
  closeCodeButton: $('#close-code-button'),
  codeType: $('#code-type'),
  codeTitle: $('#code-title'),
  codeValue: $('#code-value'),
  riskMessage: $('#risk-message'),
  copyCodeButton: $('#copy-code-button'),
  openCodeButton: $('#open-code-button'),
  movementDialog: $('#movement-dialog'),
  movementForm: $('#movement-form'),
  movementTitle: $('#movement-title'),
  movementSummary: $('#movement-summary'),
  movementItemId: $('#movement-item-id'),
  movementMode: $('#movement-mode'),
  checkoutFields: $('#checkout-fields'),
  returnFields: $('#return-fields'),
  movementAssignee: $('#movement-assignee'),
  movementJobSite: $('#movement-job-site'),
  movementDueAt: $('#movement-due-at'),
  movementLocation: $('#movement-location'),
  movementCondition: $('#movement-condition'),
  movementMaintenance: $('#movement-maintenance'),
  movementSaveButton: $('#movement-save-button'),
  toast: $('#toast'),
  cardTemplate: $('#inventory-card-template'),
  navigationLinks: [...document.querySelectorAll('.nav-link, .mobile-nav a')],
};

const store = new SmartScanStore();
let items = store.getItems();
let activity = store.getActivity();
let currentCodeResult = null;
let lookupController = null;
let installPrompt = null;
let toastTimer = null;
let torchEnabled = false;
let waitingServiceWorker = null;
let serviceWorkerRefreshing = false;

const scanner = new BarcodeCamera(elements.scannerVideo, {
  onDetected: handleDetection,
  onError: (error) => {
    console.error(error);
    setCameraMessage('No se pudo leer este cuadro. Vuelve a apuntar al código.');
  },
});

const hardwareScanner = new HardwareScannerInput({
  onScan: (scan) => {
    showToast('Código recibido desde el escáner externo.');
    handleDetection(scan);
  },
});

function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 3300);
}

function makeTag(text, tone = '') {
  const tag = document.createElement('span');
  tag.className = `tag${tone ? ` tag-${tone}` : ''}`;
  tag.textContent = text;
  return tag;
}

function makeIcon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  svg.classList.add('icon');
  svg.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', `#icon-${name}`);
  svg.append(use);
  return svg;
}

function setCameraMessage(message) {
  const statusDot = document.createElement('span');
  statusDot.setAttribute('aria-hidden', 'true');
  elements.cameraMessage.replaceChildren(statusDot, document.createTextNode(` ${message}`));
}

function setTorchLabel(enabled = false) {
  elements.torchButton.replaceChildren(makeIcon('flash'), document.createTextNode(enabled ? ' Apagar linterna' : ' Linterna'));
}

function getProductInitials(name) {
  return String(name || 'Producto')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getProductTone(item) {
  const seed = `${item.category || ''}${item.name || ''}`;
  return [...seed].reduce((total, character) => total + character.charCodeAt(0), 0) % 4;
}

function setActiveNavigation(target) {
  for (const link of elements.navigationLinks) {
    const active = link.getAttribute('href') === target;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function persistItems() {
  items = store.saveItems(items);
}

function recordActivity(input) {
  store.addActivity(input);
  activity = store.getActivity();
}

function setLatestResult({ kicker = 'ÚLTIMO RESULTADO', title, summary, tags = [], tone = 'green', action = null }) {
  elements.latestResult.hidden = false;
  elements.resultKicker.textContent = kicker;
  elements.resultTitle.textContent = title;
  elements.resultSummary.textContent = summary;
  elements.resultAccent.style.background = tone === 'danger' ? 'var(--red)' : tone === 'warn' ? 'var(--amber)' : 'var(--green)';
  elements.resultTags.replaceChildren(...tags.map(({ text, tone: tagTone }) => makeTag(text, tagTone)));
  elements.resultAction.hidden = !action;
  elements.resultAction.onclick = null;
  if (action) {
    elements.resultAction.textContent = action.label;
    elements.resultAction.onclick = action.run;
  }
}

function stateTag(item) {
  const state = getItemState(item);
  if (state === 'overdue') return { text: 'Devolución atrasada', tone: 'danger' };
  if (state === 'missing') return { text: 'Extraviado', tone: 'danger' };
  if (state === 'service') return { text: 'Requiere servicio', tone: 'warn' };
  if (state === 'low-stock') return { text: 'Bajo inventario', tone: 'warn' };
  if (state === 'expired') return { text: 'Vencido', tone: 'danger' };
  if (state === 'expiring') return { text: 'Por vencer', tone: 'warn' };
  return null;
}

function assetStatusTag(item) {
  if (!isAssetItem(item)) return null;
  if (item.assetStatus === 'checked-out') return { text: 'Prestado', tone: isAssetOverdue(item) ? 'danger' : 'blue' };
  if (item.assetStatus === 'maintenance') return { text: 'En servicio', tone: 'warn' };
  if (item.assetStatus === 'missing') return { text: 'Extraviado', tone: 'danger' };
  return { text: 'Disponible', tone: 'good' };
}

function renderInventory() {
  const summary = summarizeInventory(items);
  elements.skuCount.textContent = String(summary.skuCount);
  elements.unitCount.textContent = String(summary.totalUnits);
  elements.catalogContext.textContent = summary.assetCount ? `${summary.assetCount} activos` : 'En catálogo';
  elements.unitContext.textContent = summary.assetCount ? `${summary.checkedOutCount} prestados` : 'Existencia total';
  elements.alertCount.textContent = String(summary.alertCount);
  elements.inventoryValue.textContent = formatCurrency(summary.inventoryValue);

  const visibleItems = filterInventory(items, elements.inventorySearch.value, elements.inventoryFilter.value);
  elements.inventoryList.replaceChildren();
  elements.emptyState.hidden = visibleItems.length > 0 || items.length > 0;

  if (items.length > 0 && visibleItems.length === 0) {
    const message = document.createElement('p');
    message.className = 'muted';
    message.textContent = 'No hay productos que coincidan con este filtro.';
    elements.inventoryList.append(message);
  }

  for (const item of visibleItems) {
    const fragment = elements.cardTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.inventory-card');
    card.dataset.id = item.id;
    card.dataset.state = getItemState(item);
    const avatar = fragment.querySelector('.product-avatar');
    avatar.textContent = getProductInitials(item.name);
    avatar.dataset.tone = String(getProductTone(item));
    fragment.querySelector('h3').textContent = item.name;
    fragment.querySelector('.inventory-meta').textContent = [item.brand, item.barcode, item.serialNumber && `Serie ${item.serialNumber}`].filter(Boolean).join(' · ') || 'Sin código';
    const quantityControl = fragment.querySelector('.quantity-control');
    fragment.querySelector('.quantity-value').textContent = String(item.quantity);
    fragment.querySelector('.inventory-location').textContent = item.assetStatus === 'checked-out'
      ? [item.jobSite, item.assignedTo].filter(Boolean).join(' · ')
      : item.location || 'Sin ubicación';
    fragment.querySelector('.inventory-value').textContent = item.unitCost ? formatCurrency(item.unitCost * item.quantity, item.currency) : '—';

    const tags = fragment.querySelector('.inventory-card-tags');
    if (item.category) tags.append(makeTag(item.category));
    const assetTag = assetStatusTag(item);
    if (assetTag) tags.append(makeTag(assetTag.text, assetTag.tone));
    const status = stateTag(item);
    if (status && status.text !== assetTag?.text) tags.append(makeTag(status.text, status.tone));
    if (item.nutritionGrade) tags.append(makeTag(`Nutri-Score ${item.nutritionGrade.toUpperCase()}`, ['a', 'b'].includes(item.nutritionGrade) ? 'good' : ['d', 'e'].includes(item.nutritionGrade) ? 'danger' : 'warn'));

    if (isAssetItem(item)) {
      const statusValue = document.createElement('span');
      statusValue.className = `tag tag-${assetTag?.tone || 'good'}`;
      statusValue.textContent = assetTag?.text || 'Activo';
      quantityControl.replaceChildren(statusValue);
    }

    const editButton = fragment.querySelector('.menu-button');
    editButton.setAttribute('aria-label', `Editar ${item.name}`);
    editButton.addEventListener('click', () => openItemDialog({ item, lookup: false }));
    if (!isAssetItem(item)) {
      fragment.querySelector('.quantity-minus').addEventListener('click', () => changeQuantity(item, -1));
      fragment.querySelector('.quantity-plus').addEventListener('click', () => changeQuantity(item, 1));
    }
    const movementButton = fragment.querySelector('.movement-button');
    movementButton.hidden = !isAssetItem(item) || !['available', 'checked-out'].includes(item.assetStatus);
    movementButton.setAttribute('aria-label', item.assetStatus === 'checked-out' ? `Registrar devolución de ${item.name}` : `Prestar ${item.name}`);
    movementButton.addEventListener('click', () => openMovementDialog(item));
    const deleteButton = fragment.querySelector('.delete-button');
    deleteButton.setAttribute('aria-label', `Eliminar ${item.name}`);
    deleteButton.addEventListener('click', () => deleteItem(item));
    elements.inventoryList.append(fragment);
  }
}

function renderActivity() {
  elements.activityList.replaceChildren();
  elements.activityEmpty.hidden = activity.length > 0;
  const icons = {
    scan: 'scan',
    add: 'plus',
    update: 'edit',
    stock: 'layers',
    checkout: 'transfer',
    return: 'check',
    delete: 'trash',
    restore: 'upload',
  };

  for (const event of activity.slice(0, 20)) {
    const row = document.createElement('li');
    row.className = 'activity-item';
    const badge = document.createElement('span');
    badge.className = 'activity-badge';
    badge.append(makeIcon(icons[event.type] ?? 'activity'));
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = event.title;
    const detail = document.createElement('p');
    detail.textContent = event.detail || event.barcode;
    const time = document.createElement('time');
    time.dateTime = event.at;
    time.textContent = formatDateTime(event.at);
    content.append(title, detail);
    row.append(badge, content, time);
    elements.activityList.append(row);
  }
}

function renderAll() {
  renderInventory();
  renderActivity();
}

function changeQuantity(item, delta) {
  items = adjustItemQuantity(items, item.id, delta);
  persistItems();
  const updated = items.find((candidate) => candidate.id === item.id);
  recordActivity({
    type: 'stock',
    itemId: item.id,
    barcode: item.barcode,
    title: delta > 0 ? `Entrada: ${item.name}` : `Salida: ${item.name}`,
    detail: `${delta > 0 ? '+' : ''}${delta} · Existencia ${updated.quantity}`,
  });
  renderAll();
}

function deleteItem(item) {
  if (!window.confirm(`¿Eliminar “${item.name}” del inventario?`)) return;
  items = removeInventoryItem(items, item.id);
  persistItems();
  recordActivity({ type: 'delete', itemId: item.id, barcode: item.barcode, title: `Eliminado: ${item.name}`, detail: item.location });
  renderAll();
  showToast('Producto eliminado.');
}

function fillItemForm(item = {}) {
  elements.itemForm.reset();
  elements.itemId.value = item.id ?? '';
  elements.itemName.value = item.name ?? '';
  elements.itemBarcode.value = item.barcode ?? '';
  elements.itemBrand.value = item.brand ?? '';
  elements.itemCategory.value = item.category ?? '';
  elements.itemLocation.value = item.location ?? '';
  elements.itemTrackingType.value = item.trackingType ?? 'stock';
  elements.itemAssetStatus.value = item.assetStatus || 'available';
  elements.itemSerialNumber.value = item.serialNumber ?? '';
  elements.itemCondition.value = item.condition || 'good';
  elements.itemQuantity.value = String(item.quantity ?? 1);
  elements.itemMinStock.value = String(item.minStock ?? 0);
  elements.itemCost.value = String(item.unitCost ?? 0);
  elements.itemExpiry.value = item.expiresAt ?? '';
  elements.itemNotes.value = item.notes ?? '';
  elements.itemFormat.value = item.barcodeFormat ?? '';
  elements.itemNutritionGrade.value = item.nutritionGrade ?? '';
  elements.itemAllergens.value = Array.isArray(item.allergens) ? item.allergens.join(', ') : (item.allergens ?? '');
  elements.itemSource.value = item.source ?? '';
  updateAssetFields();
}

function updateAssetFields({ resetQuantity = false } = {}) {
  const isAsset = elements.itemTrackingType.value === 'asset';
  const editing = Boolean(elements.itemId.value);
  elements.assetFields.hidden = !isAsset;
  elements.itemQuantityField.hidden = isAsset;
  elements.itemMinStockField.hidden = isAsset;
  elements.itemExpiryField.hidden = isAsset;
  elements.stockSectionTitle.textContent = isAsset ? 'Costo y notas' : 'Existencias y costo';
  elements.itemAssetStatus.disabled = editing && elements.itemAssetStatus.value === 'checked-out';
  elements.itemDialogTitle.textContent = `${editing ? 'Editar' : 'Agregar'} ${isAsset ? 'herramienta' : 'producto'}`;
  elements.itemSaveButton.textContent = `Guardar ${isAsset ? 'herramienta' : 'producto'}`;
  if (isAsset) {
    elements.itemQuantity.value = '1';
    elements.itemMinStock.value = '0';
    elements.itemExpiry.value = '';
  } else if (resetQuantity) {
    elements.itemQuantity.value = '1';
  }
}

function applyCatalogProduct(product) {
  if (!elements.itemName.value && product.name) elements.itemName.value = product.name;
  if (!elements.itemBrand.value && product.brand) elements.itemBrand.value = product.brand;
  if (!elements.itemCategory.value && product.category) elements.itemCategory.value = product.category;
  elements.itemNutritionGrade.value = product.nutritionGrade;
  elements.itemAllergens.value = product.allergens.join(', ');
  elements.itemSource.value = product.source;
  if (!elements.itemNotes.value && product.ingredients) elements.itemNotes.value = `Ingredientes: ${product.ingredients}`.slice(0, 500);
}

async function enrichProduct(barcode) {
  const normalized = normalizeBarcode(barcode);
  if (!/^\d{6,18}$/.test(normalized)) return;
  elements.lookupStatus.hidden = false;
  elements.lookupStatus.textContent = 'Buscando información pública del producto…';
  lookupController?.abort();
  lookupController = new AbortController();

  try {
    let product = store.getCachedProduct(normalized);
    if (!product && navigator.onLine) {
      product = await lookupProduct(normalized, { signal: lookupController.signal });
      if (product) store.cacheProduct(normalized, product);
    }
    if (!product) {
      elements.lookupStatus.textContent = navigator.onLine
        ? 'Producto no encontrado. Puedes completar los datos manualmente.'
        : 'Sin conexión. Puedes completar los datos manualmente.';
      return;
    }
    applyCatalogProduct(product);
    elements.lookupStatus.textContent = `Datos encontrados en ${product.source}. Verifica la etiqueta antes de guardar.`;
  } catch (error) {
    if (error.name !== 'AbortError') elements.lookupStatus.textContent = 'No fue posible consultar el catálogo. Puedes continuar manualmente.';
  }
}

function openItemDialog({ item = null, barcode = '', format = '', lookup = true } = {}) {
  const existing = item ?? findItemByBarcode(items, barcode);
  fillItemForm(existing ?? { barcode, barcodeFormat: format, quantity: 1 });
  elements.lookupStatus.hidden = true;
  elements.lookupStatus.textContent = '';
  elements.itemDialog.showModal();
  if (lookup && !existing && barcode) enrichProduct(barcode);
  setTimeout(() => (barcode ? elements.itemName : elements.itemBarcode).focus(), 50);
}

function saveItemFromForm() {
  const values = Object.fromEntries(new FormData(elements.itemForm));
  const previous = values.id ? items.find((item) => item.id === values.id) : findItemByBarcode(items, values.barcode);
  const next = createInventoryItem({ ...previous, ...values, allergens: values.allergens });
  items = upsertInventoryItem(items, next);
  persistItems();
  const saved = findItemByBarcode(items, next.barcode) ?? next;
  recordActivity({
    type: previous ? 'update' : 'add',
    itemId: saved.id,
    barcode: saved.barcode,
    title: `${previous ? 'Actualizado' : 'Agregado'}: ${saved.name}`,
    detail: `${saved.quantity} unidades${saved.location ? ` · ${saved.location}` : ''}`,
  });
  renderAll();
  setLatestProduct(saved);
  showToast(previous ? 'Registro actualizado.' : 'Registro agregado.');
}

function openMovementDialog(item) {
  if (!isAssetItem(item)) return;
  const returning = item.assetStatus === 'checked-out';
  elements.movementForm.reset();
  elements.movementItemId.value = item.id;
  elements.movementMode.value = returning ? 'return' : 'checkout';
  elements.checkoutFields.hidden = returning;
  elements.returnFields.hidden = !returning;
  elements.movementAssignee.required = !returning;
  elements.movementJobSite.required = !returning;
  elements.movementLocation.required = returning;
  elements.movementTitle.textContent = returning ? 'Registrar devolución' : 'Registrar salida';
  elements.movementSummary.textContent = returning
    ? `${item.name} · Prestado a ${item.assignedTo || 'responsable sin nombre'}${item.jobSite ? ` · ${item.jobSite}` : ''}`
    : `${item.name}${item.serialNumber ? ` · Serie ${item.serialNumber}` : ''} · ${item.location || 'Sin ubicación'}`;
  elements.movementSaveButton.textContent = returning ? 'Confirmar devolución' : 'Registrar salida';
  elements.movementLocation.value = item.location || '';
  elements.movementCondition.value = item.condition || 'good';
  elements.movementDialog.showModal();
  setTimeout(() => (returning ? elements.movementLocation : elements.movementAssignee).focus(), 50);
}

function saveMovement() {
  const values = Object.fromEntries(new FormData(elements.movementForm));
  const item = items.find((candidate) => candidate.id === values.itemId);
  if (!item || !isAssetItem(item)) return;

  if (values.mode === 'return') {
    items = returnAsset(items, item.id, {
      location: values.location,
      condition: values.condition,
      assetStatus: values.maintenance === 'yes' ? 'maintenance' : 'available',
    });
    persistItems();
    const returned = items.find((candidate) => candidate.id === item.id);
    recordActivity({
      type: 'return',
      itemId: item.id,
      barcode: item.barcode,
      title: `Devuelto: ${item.name}`,
      detail: `${returned.location}${returned.assetStatus === 'maintenance' ? ' · Enviado a servicio' : ' · Disponible'}`,
    });
    setLatestProduct(returned);
    showToast('Devolución registrada.');
  } else {
    items = checkOutAsset(items, item.id, values);
    persistItems();
    const checkedOut = items.find((candidate) => candidate.id === item.id);
    recordActivity({
      type: 'checkout',
      itemId: item.id,
      barcode: item.barcode,
      title: `Prestado: ${item.name}`,
      detail: [checkedOut.assignedTo, checkedOut.jobSite, checkedOut.dueAt && `Devolver ${checkedOut.dueAt}`].filter(Boolean).join(' · '),
    });
    setLatestProduct(checkedOut);
    showToast('Salida registrada con responsable y obra.');
  }
  renderAll();
}

function setLatestProduct(item) {
  const tags = [];
  if (item.category) tags.push({ text: item.category });
  if (item.nutritionGrade) tags.push({ text: `Nutri-Score ${item.nutritionGrade.toUpperCase()}`, tone: ['a', 'b'].includes(item.nutritionGrade) ? 'good' : ['d', 'e'].includes(item.nutritionGrade) ? 'danger' : 'warn' });
  if (item.allergens.length) tags.push({ text: `Alérgenos: ${item.allergens.slice(0, 3).join(', ')}`, tone: 'warn' });
  if (item.source) tags.push({ text: `Fuente: ${item.source}` });
  const assetTag = assetStatusTag(item);
  if (assetTag) tags.push(assetTag);
  const status = stateTag(item);
  if (status && status.text !== assetTag?.text) tags.push(status);
  setLatestResult({
    kicker: isAssetItem(item) ? 'HERRAMIENTA GUARDADA' : 'PRODUCTO GUARDADO',
    title: item.name,
    summary: isAssetItem(item)
      ? [item.serialNumber && `Serie ${item.serialNumber}`, item.assignedTo, item.jobSite || item.location].filter(Boolean).join(' · ')
      : [item.brand, item.barcode, `${item.quantity} unidades`].filter(Boolean).join(' · '),
    tags,
    tone: ['expired', 'missing', 'overdue'].includes(getItemState(item)) ? 'danger' : getItemState(item) === 'ok' ? 'green' : 'warn',
    action: { label: 'Editar', run: () => openItemDialog({ item, lookup: false }) },
  });
}

async function startScanner() {
  elements.scannerPanel.hidden = false;
  setCameraMessage('Solicitando acceso a la cámara…');
  elements.scannerPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  torchEnabled = false;
  setTorchLabel();
  try {
    const capabilities = await scanner.start();
    setCameraMessage('Buscando un código…');
    elements.torchButton.disabled = !capabilities.torch;
    if (capabilities.zoom) {
      elements.zoomControl.hidden = false;
      elements.zoomRange.min = String(capabilities.zoom.min);
      elements.zoomRange.max = String(capabilities.zoom.max);
      elements.zoomRange.step = String(capabilities.zoom.step);
      elements.zoomRange.value = String(capabilities.zoom.min);
    } else {
      elements.zoomControl.hidden = true;
    }
  } catch (error) {
    setCameraMessage(error.message || 'No se pudo abrir la cámara.');
    showToast(error.message || 'No se pudo abrir la cámara.');
  }
}

function stopScanner() {
  scanner.stop();
  torchEnabled = false;
  elements.scannerPanel.hidden = true;
}

function vibrate() {
  if (navigator.vibrate) navigator.vibrate(70);
}

function batchProduct(result, format) {
  const existing = findItemByBarcode(items, result.value);
  if (existing) {
    items = adjustItemQuantity(items, existing.id, 1);
    persistItems();
    recordActivity({ type: 'stock', itemId: existing.id, barcode: existing.barcode, title: `Escaneo lote: ${existing.name}`, detail: '+1 unidad' });
    setCameraMessage(`${existing.name}: +1`);
  } else {
    const placeholder = createInventoryItem({
      barcode: result.value,
      barcodeFormat: format,
      name: `Producto ${result.value.slice(-6)}`,
      quantity: 1,
    });
    items = upsertInventoryItem(items, placeholder);
    persistItems();
    recordActivity({ type: 'add', itemId: placeholder.id, barcode: placeholder.barcode, title: 'Nuevo producto en lote', detail: placeholder.barcode });
    setCameraMessage(`Nuevo código ${result.value.slice(-8)} guardado`);
  }
  renderAll();
  setTimeout(() => {
    if (scanner.active) setCameraMessage('Listo para el siguiente código…');
  }, 900);
}

function showCodeResult(result) {
  currentCodeResult = result;
  elements.codeType.textContent = result.label.toUpperCase();
  elements.codeTitle.textContent = result.level === 'caution' ? 'Revisa antes de continuar' : 'Código detectado';
  elements.codeValue.textContent = result.value;
  elements.riskMessage.hidden = result.warnings.length === 0;
  elements.riskMessage.textContent = result.warnings.join(' ');
  elements.openCodeButton.hidden = !result.actionUrl || result.level === 'blocked';
  elements.codeDialog.showModal();
  setLatestResult({
    kicker: result.label.toUpperCase(),
    title: result.level === 'caution' ? 'Resultado con precaución' : 'Resultado listo',
    summary: result.value,
    tags: result.warnings.length ? [{ text: 'Verifica el destino', tone: 'warn' }] : [{ text: 'Sin alertas básicas', tone: 'good' }],
    tone: result.level === 'caution' ? 'warn' : 'green',
    action: { label: 'Ver resultado', run: () => elements.codeDialog.showModal() },
  });
}

function handleDetection({ value, format }) {
  vibrate();
  const result = classifyCode(value, format);
  recordActivity({ type: 'scan', barcode: result.value, title: `Escaneo: ${result.label}`, detail: format || 'formato desconocido' });

  if (result.type === 'product') {
    if (elements.batchMode.checked) {
      batchProduct(result, format);
      return;
    }
    stopScanner();
    const existing = findItemByBarcode(items, result.value);
    openItemDialog({ item: existing, barcode: result.value, format, lookup: !existing });
    renderActivity();
    return;
  }

  stopScanner();
  showCodeResult(result);
  renderActivity();
}

async function scanImage(file) {
  try {
    showToast('Analizando la imagen…');
    const results = await scanner.scanImage(file);
    if (!results.length) {
      showToast('No se encontró un código legible en la imagen.');
      return;
    }
    if (results.length > 1) showToast(`Se encontraron ${results.length} códigos; mostrando el primero.`);
    handleDetection(results[0]);
  } catch (error) {
    showToast(error.message || 'No se pudo analizar la imagen.');
  }
}

function updateNetworkState() {
  elements.networkBanner.hidden = navigator.onLine;
}

elements.startScanButton.addEventListener('click', startScanner);
elements.sideScanButton.addEventListener('click', startScanner);
elements.mobileScanButton.addEventListener('click', startScanner);
elements.emptyScanButton.addEventListener('click', startScanner);
elements.stopScanButton.addEventListener('click', stopScanner);
elements.manualButton.addEventListener('click', () => openItemDialog());
elements.addItemButton.addEventListener('click', () => openItemDialog());
elements.imageButton.addEventListener('click', () => elements.imageInput.click());
elements.imageInput.addEventListener('change', () => {
  const [file] = elements.imageInput.files;
  if (file) scanImage(file);
  elements.imageInput.value = '';
});
elements.inventorySearch.addEventListener('input', renderInventory);
elements.inventoryFilter.addEventListener('change', renderInventory);
for (const link of elements.navigationLinks) {
  link.addEventListener('click', () => setActiveNavigation(link.getAttribute('href')));
}

elements.itemForm.addEventListener('submit', (event) => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  if (!elements.itemForm.reportValidity()) return;
  saveItemFromForm();
  elements.itemDialog.close('save');
});
elements.itemDialog.addEventListener('close', () => lookupController?.abort());
elements.itemTrackingType.addEventListener('change', () => updateAssetFields({ resetQuantity: true }));

elements.movementForm.addEventListener('submit', (event) => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  if (!elements.movementForm.reportValidity()) return;
  saveMovement();
  elements.movementDialog.close('save');
});

elements.torchButton.addEventListener('click', async () => {
  try {
    torchEnabled = !torchEnabled;
    await scanner.setTorch(torchEnabled);
    setTorchLabel(torchEnabled);
  } catch {
    torchEnabled = false;
    setTorchLabel();
    showToast('La linterna no respondió en este dispositivo.');
  }
});
elements.zoomRange.addEventListener('input', () => scanner.setZoom(elements.zoomRange.value).catch(() => {}));

elements.closeCodeButton.addEventListener('click', () => elements.codeDialog.close());
elements.copyCodeButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentCodeResult?.value ?? '');
    showToast('Resultado copiado.');
  } catch {
    showToast('No se pudo copiar automáticamente.');
  }
});
elements.openCodeButton.addEventListener('click', () => {
  if (!currentCodeResult?.actionUrl) return;
  if (currentCodeResult.level === 'caution' && !window.confirm('El enlace tiene señales que debes revisar. ¿Abrirlo de todas maneras?')) return;
  if (/^https?:/i.test(currentCodeResult.actionUrl)) {
    window.open(currentCodeResult.actionUrl, '_blank', 'noopener,noreferrer');
  } else {
    window.location.assign(currentCodeResult.actionUrl);
  }
});

elements.exportCsvButton.addEventListener('click', () => {
  if (!items.length) return showToast('No hay inventario para exportar.');
  downloadText(`smartscan-inventory-${new Date().toISOString().slice(0, 10)}.csv`, `\ufeff${inventoryToCsv(items)}`, 'text/csv;charset=utf-8');
});
elements.backupButton.addEventListener('click', () => {
  downloadText(`smartscan-backup-${new Date().toISOString().slice(0, 10)}.json`, store.exportBackup(), 'application/json');
});
elements.restoreButton.addEventListener('click', () => elements.restoreInput.click());
elements.restoreInput.addEventListener('change', async () => {
  const [file] = elements.restoreInput.files;
  elements.restoreInput.value = '';
  if (!file) return;
  if (!window.confirm('Restaurar reemplazará el inventario e historial actuales. ¿Continuar?')) return;
  try {
    const restored = store.importBackup(await file.text());
    items = restored.items;
    activity = restored.activity;
    recordActivity({ type: 'restore', title: 'Copia restaurada', detail: `${items.length} productos` });
    renderAll();
    showToast('Copia restaurada correctamente.');
  } catch (error) {
    showToast(error.message || 'La copia no pudo restaurarse.');
  }
});
elements.clearHistoryButton.addEventListener('click', () => {
  if (!activity.length) return;
  if (!window.confirm('¿Borrar todo el historial de actividad? El inventario no se eliminará.')) return;
  store.clearActivity();
  activity = [];
  renderActivity();
});

window.addEventListener('online', updateNetworkState);
window.addEventListener('offline', updateNetworkState);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && scanner.active) stopScanner();
});
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  elements.installButton.hidden = false;
});
elements.installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  elements.installButton.hidden = true;
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  elements.installButton.hidden = true;
  showToast('SmartScan Pro quedó instalado.');
});

function showAppUpdate(worker) {
  waitingServiceWorker = worker;
  elements.updateBanner.hidden = false;
}

elements.updateButton.addEventListener('click', () => {
  if (!waitingServiceWorker) return;
  elements.updateButton.disabled = true;
  elements.updateButton.textContent = 'Actualizando…';
  waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
});

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || (location.protocol !== 'https:' && location.hostname !== 'localhost')) return;
  try {
    const registration = await navigator.serviceWorker.register('./sw.js');
    if (registration.waiting && navigator.serviceWorker.controller) showAppUpdate(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) showAppUpdate(installing);
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!waitingServiceWorker || serviceWorkerRefreshing) return;
      serviceWorkerRefreshing = true;
      window.location.reload();
    });
  } catch (error) {
    console.warn('Service worker unavailable', error);
  }
}

async function initialize() {
  renderAll();
  updateNetworkState();
  hardwareScanner.attach(document);
  const support = await BarcodeCamera.getSupport();
  elements.scannerSupport.textContent = support.supported
    ? `Cámara compatible con ${support.formats.length} formatos en este dispositivo.`
    : 'La cámara de este navegador no detecta códigos; entrada manual disponible.';
  await registerServiceWorker();
}

initialize();
