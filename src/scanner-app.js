import { BarcodeCamera } from './scanner.js';
import { classifyCode } from './result-actions.js';

const $ = (selector) => document.querySelector(selector);
const elements = {
  start: $('#start-scan-button'),
  stop: $('#stop-scan-button'),
  imageButton: $('#image-button'),
  imageInput: $('#image-input'),
  video: $('#scanner-video'),
  message: $('#camera-message'),
  format: $('#result-format'),
  value: $('#result-value'),
  copy: $('#copy-button'),
  share: $('#share-button'),
  open: $('#open-link'),
  history: $('#history-list'),
  historyEmpty: $('#history-empty'),
  clearHistory: $('#clear-history'),
};

const HISTORY_KEY = 'proservices-scanner-history-v1';
let currentValue = '';

const readHistory = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeHistory = (history) => localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));

function renderHistory() {
  const history = readHistory();
  elements.history.replaceChildren();
  elements.historyEmpty.hidden = history.length > 0;
  for (const entry of history) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'capture-action';
    row.style.width = '100%';
    row.innerHTML = `<span><strong>${entry.format || 'Código'}</strong><small></small></span>`;
    row.querySelector('small').textContent = entry.value;
    row.addEventListener('click', () => showResult(entry.value, entry.format, false));
    elements.history.append(row);
  }
}

function addHistory(value, format) {
  const history = readHistory().filter((entry) => entry.value !== value);
  history.unshift({ value, format, scannedAt: new Date().toISOString() });
  writeHistory(history);
  renderHistory();
}

function showResult(value, format = '', persist = true) {
  currentValue = value;
  const result = classifyCode(value);
  elements.format.textContent = (format || result.type || 'Código').toUpperCase();
  elements.value.textContent = value;
  elements.copy.disabled = false;
  elements.share.disabled = false;
  const safeUrl = result.action?.url || (result.type === 'url' ? value : '');
  if (safeUrl) {
    elements.open.href = safeUrl;
    elements.open.hidden = false;
  } else {
    elements.open.hidden = true;
    elements.open.removeAttribute('href');
  }
  if (persist) addHistory(value, format || result.type || 'Código');
}

const camera = new BarcodeCamera(elements.video, {
  onDetected: ({ value, format }) => {
    showResult(value, format);
    elements.message.textContent = 'Código leído correctamente.';
  },
  onError: (error) => {
    elements.message.textContent = error?.message || 'No se pudo leer el código.';
  },
});

elements.start.addEventListener('click', async () => {
  try {
    elements.message.textContent = 'Abriendo cámara…';
    await camera.start();
    elements.video.hidden = false;
    elements.stop.hidden = false;
    elements.start.hidden = true;
    elements.message.textContent = 'Apunta la cámara al código.';
  } catch (error) {
    elements.message.textContent = error?.message || 'No se pudo abrir la cámara.';
  }
});

elements.stop.addEventListener('click', () => {
  camera.stop();
  elements.video.hidden = true;
  elements.stop.hidden = true;
  elements.start.hidden = false;
  elements.message.textContent = 'Cámara detenida.';
});

elements.imageButton.addEventListener('click', () => elements.imageInput.click());
elements.imageInput.addEventListener('change', async () => {
  const [file] = elements.imageInput.files || [];
  if (!file) return;
  try {
    const results = await camera.scanImage(file);
    if (!results.length) {
      elements.message.textContent = 'No encontré códigos en esa imagen.';
      return;
    }
    showResult(results[0].value, results[0].format);
    elements.message.textContent = `Encontré ${results.length} código(s).`;
  } catch (error) {
    elements.message.textContent = error?.message || 'No se pudo escanear la imagen.';
  } finally {
    elements.imageInput.value = '';
  }
});

elements.copy.addEventListener('click', async () => {
  if (!currentValue) return;
  await navigator.clipboard.writeText(currentValue);
  elements.message.textContent = 'Copiado.';
});

elements.share.addEventListener('click', async () => {
  if (!currentValue) return;
  if (navigator.share) await navigator.share({ text: currentValue });
  else {
    await navigator.clipboard.writeText(currentValue);
    elements.message.textContent = 'Compartir no está disponible; copié el valor.';
  }
});

elements.clearHistory.addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

window.addEventListener('pagehide', () => camera.stop());
renderHistory();
