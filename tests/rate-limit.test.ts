// tests/rate-limit.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeResetTimestamp, sanitizeStoredBlockUntil, MAX_BLOCK_MS } from '../src/core/rate-limit';

const NOW = 1_785_000_000_000;

test('normalizeResetTimestamp: секунды переводятся в миллисекунды', () => {
  assert.equal(normalizeResetTimestamp('1785715200', NOW), 1785715200 * 1000);
});

test('normalizeResetTimestamp: значение уже в миллисекундах не меняется', () => {
  assert.equal(normalizeResetTimestamp('1785715200000', NOW), 1785715200000);
});

test('normalizeResetTimestamp: отсутствующий/некорректный заголовок -> null', () => {
  assert.equal(normalizeResetTimestamp(null, NOW), null);
  assert.equal(normalizeResetTimestamp('', NOW), null);
  assert.equal(normalizeResetTimestamp('не-число', NOW), null);
});

test('normalizeResetTimestamp: испорченное (задвоенное) значение обрезается верхней границей', () => {
  const corrupted = '1785715200000000'; // баг двойного домножения на 1000
  assert.equal(normalizeResetTimestamp(corrupted, NOW), NOW + MAX_BLOCK_MS);
});

test('sanitizeStoredBlockUntil: обрезает уже сохранённое испорченное значение', () => {
  assert.equal(sanitizeStoredBlockUntil(1785715200000000, NOW), NOW + MAX_BLOCK_MS);
});

test('sanitizeStoredBlockUntil: не трогает нормальное значение', () => {
  const normal = NOW + 1000 * 60 * 60;
  assert.equal(sanitizeStoredBlockUntil(normal, NOW), normal);
});
