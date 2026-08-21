import { normalizeBarcode } from './inventory.js';

function isIpAddress(hostname) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
}

export function assessUrl(value) {
  const warnings = [];
  let url;
  try {
    url = new URL(value);
  } catch {
    return { level: 'blocked', warnings: ['La dirección no es válida.'], url: null };
  }

  if (!['https:', 'http:'].includes(url.protocol)) {
    return { level: 'blocked', warnings: [`El protocolo ${url.protocol} no se abre automáticamente.`], url };
  }
  if (url.protocol !== 'https:') warnings.push('La dirección no usa una conexión HTTPS cifrada.');
  if (url.username || url.password) warnings.push('La dirección contiene credenciales ocultas.');
  if (url.hostname.includes('xn--')) warnings.push('El dominio usa caracteres internacionales codificados; verifica el nombre con cuidado.');
  if (isIpAddress(url.hostname)) warnings.push('La dirección usa una IP en lugar de un nombre de dominio.');
  if (url.hostname.split('.').length > 5) warnings.push('El dominio tiene muchos subdominios; verifica el destino.');

  return { level: warnings.length ? 'caution' : 'safe', warnings, url };
}

export function classifyCode(rawValue, format = '') {
  const value = String(rawValue ?? '').trim();
  const normalizedFormat = String(format ?? '').toLowerCase();

  if (/^https?:\/\//i.test(value)) {
    const assessment = assessUrl(value);
    return { type: 'url', label: 'Enlace web', value, actionUrl: assessment.url?.href ?? '', ...assessment };
  }
  if (/^www\./i.test(value)) {
    const candidate = `https://${value}`;
    const assessment = assessUrl(candidate);
    return { type: 'url', label: 'Enlace web', value, actionUrl: assessment.url?.href ?? '', ...assessment };
  }
  if (/^mailto:/i.test(value)) return { type: 'email', label: 'Correo electrónico', value, actionUrl: value, level: 'safe', warnings: [] };
  if (/^tel:/i.test(value)) return { type: 'phone', label: 'Teléfono', value, actionUrl: value, level: 'safe', warnings: [] };
  if (/^sms:/i.test(value)) return { type: 'sms', label: 'Mensaje SMS', value, actionUrl: value, level: 'safe', warnings: [] };
  if (/^geo:/i.test(value)) return { type: 'location', label: 'Ubicación', value, actionUrl: value, level: 'safe', warnings: [] };
  if (/^wifi:/i.test(value)) return { type: 'wifi', label: 'Red Wi-Fi', value, actionUrl: '', level: 'caution', warnings: ['Revisa el nombre de la red antes de conectarte.'] };

  const barcode = normalizeBarcode(value);
  const barcodeFormats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'code_93', 'code_128', 'itf', 'codabar'];
  if (barcodeFormats.includes(normalizedFormat) || /^\d{6,18}$/.test(barcode)) {
    return { type: 'product', label: 'Código de producto', value: barcode, actionUrl: '', level: 'safe', warnings: [] };
  }

  return { type: 'text', label: normalizedFormat === 'qr_code' ? 'Texto QR' : 'Texto', value, actionUrl: '', level: 'safe', warnings: [] };
}

