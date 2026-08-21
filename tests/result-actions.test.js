import test from 'node:test';
import assert from 'node:assert/strict';
import { assessUrl, classifyCode } from '../src/result-actions.js';

test('classifies numeric codes as products', () => {
  const result = classifyCode('012345678905', 'upc_a');
  assert.equal(result.type, 'product');
  assert.equal(result.value, '012345678905');
});

test('classifies a secure URL without warnings', () => {
  const result = classifyCode('https://example.com/item', 'qr_code');
  assert.equal(result.type, 'url');
  assert.equal(result.level, 'safe');
  assert.deepEqual(result.warnings, []);
});

test('warns for HTTP, IP hosts, and encoded international domains', () => {
  const insecure = assessUrl('http://192.168.1.1/login');
  assert.equal(insecure.level, 'caution');
  assert.equal(insecure.warnings.length, 2);

  const encoded = assessUrl('https://xn--exampl-ova.test');
  assert.equal(encoded.level, 'caution');
  assert.match(encoded.warnings[0], /caracteres internacionales/i);
});

test('blocks unsupported URL protocols', () => {
  const result = assessUrl('javascript:alert(1)');
  assert.equal(result.level, 'blocked');
});

test('recognizes Wi-Fi and plain text QR payloads', () => {
  assert.equal(classifyCode('WIFI:T:WPA;S:Office;P:secret;;', 'qr_code').type, 'wifi');
  assert.equal(classifyCode('Hello world', 'qr_code').type, 'text');
});

