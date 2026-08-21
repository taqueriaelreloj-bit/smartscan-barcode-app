const DEFAULT_TERMINATORS = new Set(['Enter', 'Tab']);

function isEditableTarget(target) {
  if (!target || typeof target !== 'object') return false;
  const tagName = String(target.tagName ?? '').toLowerCase();
  return ['input', 'textarea', 'select'].includes(tagName) || Boolean(target.isContentEditable);
}

export class HardwareScannerInput {
  constructor({ onScan, maxGapMs = 90, minLength = 3 } = {}) {
    this.onScan = onScan ?? (() => {});
    this.maxGapMs = maxGapMs;
    this.minLength = minLength;
    this.buffer = '';
    this.lastKeyAt = 0;
    this.startedAt = 0;
    this.target = null;
    this.boundKeydown = (event) => this.handleKeydown(event);
  }

  reset() {
    this.buffer = '';
    this.lastKeyAt = 0;
    this.startedAt = 0;
  }

  handleKeydown(event, now = performance.now()) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.repeat) return false;
    if (isEditableTarget(event.target)) {
      this.reset();
      return false;
    }

    if (DEFAULT_TERMINATORS.has(event.key)) {
      const value = this.buffer.trim();
      const elapsed = this.lastKeyAt - this.startedAt;
      const averageGap = value.length > 1 ? elapsed / (value.length - 1) : Number.POSITIVE_INFINITY;
      const accepted = value.length >= this.minLength && averageGap <= this.maxGapMs;
      this.reset();
      if (!accepted) return false;
      event.preventDefault?.();
      this.onScan({ value, format: 'hardware' });
      return true;
    }

    if (event.key.length !== 1) return false;
    if (this.lastKeyAt && now - this.lastKeyAt > this.maxGapMs) this.reset();
    if (!this.buffer) this.startedAt = now;
    this.buffer += event.key;
    this.lastKeyAt = now;
    return false;
  }

  attach(target = document) {
    if (this.target === target) return;
    this.detach();
    this.target = target;
    this.target.addEventListener('keydown', this.boundKeydown, true);
  }

  detach() {
    this.target?.removeEventListener?.('keydown', this.boundKeydown, true);
    this.target = null;
    this.reset();
  }
}

