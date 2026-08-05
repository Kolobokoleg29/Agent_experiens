// tests/retry.service.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRetry } from '../src/services/retry.service';

test('withRetry: успевает после нескольких неудачных попыток', async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls++;
      if (calls < 3) throw new Error('500 Internal Server Error');
      return 'ok';
    },
    { maxAttempts: 5, baseDelay: 1, jitter: false }
  );
  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('withRetry: бросает ошибку после исчерпания maxAttempts', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls++;
          throw new Error('502 Bad Gateway');
        },
        { maxAttempts: 3, baseDelay: 1, jitter: false }
      ),
    /502/
  );
  assert.equal(calls, 3);
});

test('withRetry: не повторяет ошибку, не входящую в retryableErrors', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls++;
          throw new Error('401 Unauthorized');
        },
        { maxAttempts: 5, baseDelay: 1, jitter: false, retryableErrors: ['429', '500', '502', '503', '504'] }
      ),
    /401/
  );
  // 401 не входит в retryableErrors -> должна быть ровно 1 попытка, без повторов
  assert.equal(calls, 1);
});

test('withRetry: успех с первой попытки не делает лишних вызовов', async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    return 42;
  });
  assert.equal(result, 42);
  assert.equal(calls, 1);
});
