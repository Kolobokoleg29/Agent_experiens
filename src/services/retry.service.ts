// src/services/retry.service.ts

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number; // в миллисекундах
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  retryableErrors?: (number | string)[]; // коды HTTP или текст ошибки
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

/**
 * Определяет, можно ли повторять попытку при данной ошибке.
 */
function isRetryableError(error: any, retryableErrors?: (number | string)[]): boolean {
  if (!retryableErrors) return true; // по умолчанию все ошибки считаем повторяемыми
  const status = error.status || error.code || error.message;
  return retryableErrors.some(code => String(status).includes(String(code)));
}

/**
 * Выполняет функцию с повторными попытками при ошибках.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    jitter = true,
    retryableErrors,
    onRetry,
  } = options;

  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt >= maxAttempts || !isRetryableError(error, retryableErrors)) {
        throw error;
      }

      // Рассчитываем задержку с экспоненциальным backoff и опциональным джиттером
      let delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5); // ±50% случайности
      }
      delay = Math.min(delay, maxDelay);

      if (onRetry) {
        onRetry(attempt, error, delay);
      } else {
        console.warn(`⚠️ Ошибка: ${error.message}. Повторная попытка ${attempt}/${maxAttempts} через ${delay}мс...`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Эта строка никогда не должна достигаться, но оставим для TypeScript
  throw new Error('Не удалось выполнить операцию после всех попыток');
}