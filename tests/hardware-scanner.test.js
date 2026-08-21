import test from 'node:test';
import assert from 'node:assert/strict';
import { HardwareScannerInput } from '../src/hardware-scanner.js';

function keyEvent(key, overrides = {}) {
  return {
    key,
    defaultPrevented: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    isComposing: false,
    repeat: false,
    target: null,
    preventDefault() { this.defaultPrevented = true; },
    ...overrides,
  };
}

test('emits a fast keyboard-wedge barcode on Enter', () => {
  const scans = [];
  const scanner = new HardwareScannerInput({ onScan: (scan) => scans.push(scan) });
  let now = 100;
  for (const key of '012345678905') {
    scanner.handleKeydown(keyEvent(key), now);
    now += 18;
  }
  const terminator = keyEvent('Enter');
  assert.equal(scanner.handleKeydown(terminator, now), true);
  assert.equal(terminator.defaultPrevented, true);
  assert.deepEqual(scans, [{ value: '012345678905', format: 'hardware' }]);
});

test('does not treat normal slow typing as a scanner', () => {
  const scans = [];
  const scanner = new HardwareScannerInput({ onScan: (scan) => scans.push(scan) });
  scanner.handleKeydown(keyEvent('1'), 100);
  scanner.handleKeydown(keyEvent('2'), 300);
  scanner.handleKeydown(keyEvent('3'), 500);
  assert.equal(scanner.handleKeydown(keyEvent('Enter'), 700), false);
  assert.deepEqual(scans, []);
});

test('ignores keystrokes inside editable controls', () => {
  const scans = [];
  const scanner = new HardwareScannerInput({ onScan: (scan) => scans.push(scan) });
  const target = { tagName: 'INPUT', isContentEditable: false };
  for (const key of '12345') scanner.handleKeydown(keyEvent(key, { target }), 100);
  scanner.handleKeydown(keyEvent('Enter', { target }), 120);
  assert.deepEqual(scans, []);
});

