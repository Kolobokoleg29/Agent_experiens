// src/core/openrouter-client.ts
import dotenv from 'dotenv';
import { TokenTracker } from './token-tracker';
import { Heartbeat } from './heartbeat';

dotenv.config();

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  task?: string;
  useCache?: boolean;
  model?: string;
}

export class OpenRouterClient {
  private apiKeys: string[];
  private currentKeyIndex: number;
  private defaultModel: string;
  private fallbackModels: string[];
  private timeoutMs: number;
  private tracker: TokenTracker;

  constructor(
    apiKeys?: string | string[],
    defaultModel = 'openrouter/free',
    fallbackModels: string[] = [
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'poolside/laguna-m.1:free',
      'cohere/north-mini-code:free',
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'openai/gpt-oss-20b:free',
      'openrouter/free',
    ],
    timeoutMs = 120000
  ) {
    // Загрузка ключей
    let keys: string[] = [];
    if (apiKeys) {
      keys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
    } else {
      const keysEnv = process.env.OPENROUTER_API_KEYS;
      if (keysEnv) {
        keys = keysEnv.split(',').map(k => k.trim()).filter(Boolean);
      } else {
        const singleKey = process.env.OPENROUTER_API_KEY;
        if (singleKey) keys = [singleKey];
      }
    }

    this.apiKeys = keys.map(k => k.replace(/^["']|["']$/g, '').trim()).filter(k => k.length > 0);
    if (this.apiKeys.length === 0) {
      throw new Error('Не задан ни один API-ключ. Укажите OPENROUTER_API_KEYS или OPENROUTER_API_KEY в .env.');
    }

    this.currentKeyIndex = 0;
    this.defaultModel = defaultModel;
    this.fallbackModels = fallbackModels;
    this.timeoutMs = timeoutMs;
    this.tracker = new TokenTracker();

    console.log(`[OpenRouter] Загружено ключей: ${this.apiKeys.length}`);
    console.log(`[OpenRouter] Основная модель: ${this.defaultModel}`);
    console.log(`[OpenRouter] Резервные модели: ${this.fallbackModels.join(', ')}`);
  }

  private getCurrentKey(): string {
    return this.apiKeys[this.currentKeyIndex];
  }

  private rotateKey(): boolean {
    if (this.currentKeyIndex < this.apiKeys.length - 1) {
      this.currentKeyIndex++;
      console.log(`🔄 Переключились на ключ #${this.currentKeyIndex + 1}`);
      return true;
    }
    return false;
  }

  private async chatWithRetry(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    tools: any[] | undefined,
    key: string
  ): Promise<{ content: string; model: string }> {
    this.tracker.trackRequest();

    const stopHeartbeat = Heartbeat.start(`Запрос к ${model} (ключ #${this.currentKeyIndex + 1})`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    const callStart = Date.now();

    try {
      const body: any = { model, messages, temperature, max_tokens: maxTokens };
      if (tools) body.tools = tools;

      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      stopHeartbeat();

      const elapsed = Math.round((Date.now() - callStart) / 1000);
      console.log(`   ✓ Ответ получен за ${elapsed} сек`);

      const remaining = resp.headers.get('x-ratelimit-remaining');
      const limit = resp.headers.get('x-ratelimit-limit');
      if (remaining || limit) {
        console.log(`[Лимиты API] Осталось: ${remaining ?? '?'}/${limit ?? '?'}`);
      }

      const data = await resp.json();
      if (!resp.ok) {
        if (resp.status === 429) {
          const reset = resp.headers.get('x-ratelimit-reset');
          const resetDate = reset ? new Date(parseInt(reset)).toLocaleString() : 'неизвестно';
          throw new Error(`429: Лимит запросов для модели ${model} исчерпан. Сброс: ${resetDate}.`);
        }
        if (resp.status === 401) {
          throw new Error('401: Неверный API-ключ (User not found).');
        }
        if (resp.status === 404) {
          throw new Error(`404: Модель ${model} не найдена.`);
        }
        throw new Error(`API ошибка (${resp.status}): ${JSON.stringify(data)}`);
      }

      const content = data.choices?.[0]?.message?.content || '';
      return { content, model: data.model || model };
    } catch (err: any) {
      clearTimeout(timeoutId);
      stopHeartbeat();
      if (err.name === 'AbortError') {
        throw new Error(`Тайм-аут: модель не ответила за ${this.timeoutMs / 1000} сек.`);
      }
      throw err;
    }
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<{ content: string; model: string }> {
    const model = options.model || this.defaultModel;
    const temperature = options.temperature ?? 0.5;
    const maxTokens = options.maxTokens ?? 4096;

    // Перебираем ключи
    for (let ki = 0; ki < this.apiKeys.length; ki++) {
      const key = this.apiKeys[ki];
      let keyError = false; // флаг, если ключ дал 429/401

      // Перебираем модели
      for (let mi = 0; mi < this.fallbackModels.length; mi++) {
        const m = this.fallbackModels[mi];
        try {
          console.log(`🤖 Пробуем модель: ${m} (ключ #${ki + 1})`);
          const result = await this.chatWithRetry(messages, m, temperature, maxTokens, options.tools, key);
          // Если успешно — обновляем индекс текущего ключа для будущих запросов
          this.currentKeyIndex = ki;
          return result;
        } catch (err: any) {
          // Если ошибка 429 или 401 — сразу переключаем ключ, не перебирая остальные модели
          if (err.message.includes('429') || err.message.includes('401')) {
            console.warn(`⚠️ Ключ #${ki + 1} дал ошибку: ${err.message.split(':')[0]}. Переключаем на следующий ключ.`);
            keyError = true;
            break; // выходим из цикла по моделям
          } else if (err.message.includes('404')) {
            // Модель недоступна — пробуем следующую модель с этим же ключом
            console.warn(`⚠️ Модель ${m} недоступна. Пробуем следующую...`);
            continue;
          } else {
            // Другие ошибки (таймаут, парсинг) — пробуем следующую модель с этим же ключом
            console.warn(`⚠️ Ошибка на модели ${m}: ${err.message}. Пробуем следующую...`);
            continue;
          }
        }
      }

      // Если мы вышли из внутреннего цикла из-за ошибки ключа, переходим к следующему ключу
      if (keyError) {
        continue;
      }

      // Если мы перебрали все модели и ни одна не сработала (например, все 404), тоже переходим к следующему ключу
      console.warn(`⚠️ Все модели для ключа #${ki + 1} недоступны. Пробуем следующий ключ...`);
    }

    throw new Error('Все ключи исчерпали лимит или невалидны. Попробуйте позже или добавьте новые ключи.');
  }
}