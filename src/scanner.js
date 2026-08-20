const DESIRED_FORMATS = [
  'qr_code', 'data_matrix', 'aztec', 'pdf417', 'ean_13', 'ean_8', 'upc_a', 'upc_e',
  'code_39', 'code_93', 'code_128', 'itf', 'codabar',
];

export class BarcodeCamera {
  constructor(video, { onDetected, onError } = {}) {
    this.video = video;
    this.onDetected = onDetected ?? (() => {});
    this.onError = onError ?? (() => {});
    this.detector = null;
    this.stream = null;
    this.track = null;
    this.frameRequest = null;
    this.active = false;
    this.lastDetectionAt = 0;
    this.lastValue = '';
    this.lastFrameAt = 0;
  }

  static async getSupport() {
    if (!('BarcodeDetector' in window)) return { supported: false, formats: [] };
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      return { supported: formats.length > 0, formats };
    } catch {
      return { supported: false, formats: [] };
    }
  }

  async #ensureDetector() {
    if (this.detector) return;
    const support = await BarcodeCamera.getSupport();
    if (!support.supported) throw new Error('Este navegador no incluye detección de códigos. Usa entrada manual o un teléfono Chrome compatible.');
    const formats = DESIRED_FORMATS.filter((format) => support.formats.includes(format));
    this.detector = new window.BarcodeDetector({ formats });
  }

  async start() {
    if (this.active) return this.getCameraCapabilities();
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara no está disponible en este navegador.');
    await this.#ensureDetector();

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
    this.track = this.stream.getVideoTracks()[0] ?? null;
    this.video.srcObject = this.stream;
    await this.video.play();
    this.active = true;
    this.frameRequest = requestAnimationFrame((time) => this.#scanFrame(time));
    return this.getCameraCapabilities();
  }

  async #scanFrame(time) {
    if (!this.active) return;
    this.frameRequest = requestAnimationFrame((nextTime) => this.#scanFrame(nextTime));
    if (time - this.lastFrameAt < 220 || this.video.readyState < 2) return;
    this.lastFrameAt = time;

    try {
      const results = await this.detector.detect(this.video);
      const detection = results.find((entry) => entry.rawValue?.trim());
      if (!detection) return;

      const value = detection.rawValue.trim();
      const now = Date.now();
      if (value === this.lastValue && now - this.lastDetectionAt < 1600) return;
      this.lastValue = value;
      this.lastDetectionAt = now;
      this.onDetected({ value, format: detection.format ?? '' });
    } catch (error) {
      if (this.active) this.onError(error);
    }
  }

  async scanImage(file) {
    await this.#ensureDetector();
    const bitmap = await createImageBitmap(file);
    try {
      const results = await this.detector.detect(bitmap);
      return results.map((entry) => ({ value: entry.rawValue?.trim() ?? '', format: entry.format ?? '' })).filter((entry) => entry.value);
    } finally {
      bitmap.close();
    }
  }

  getCameraCapabilities() {
    const capabilities = this.track?.getCapabilities?.() ?? {};
    return {
      torch: Boolean(capabilities.torch),
      zoom: capabilities.zoom
        ? { min: capabilities.zoom.min, max: capabilities.zoom.max, step: capabilities.zoom.step ?? 0.1 }
        : null,
    };
  }

  async setTorch(enabled) {
    if (!this.track) return false;
    const capabilities = this.getCameraCapabilities();
    if (!capabilities.torch) return false;
    await this.track.applyConstraints({ advanced: [{ torch: Boolean(enabled) }] });
    return true;
  }

  async setZoom(value) {
    if (!this.track) return false;
    const capabilities = this.getCameraCapabilities();
    if (!capabilities.zoom) return false;
    const zoom = Math.min(capabilities.zoom.max, Math.max(capabilities.zoom.min, Number(value)));
    await this.track.applyConstraints({ advanced: [{ zoom }] });
    return true;
  }

  stop() {
    this.active = false;
    if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = null;
    for (const track of this.stream?.getTracks?.() ?? []) track.stop();
    this.stream = null;
    this.track = null;
    this.video.pause();
    this.video.srcObject = null;
  }
}

