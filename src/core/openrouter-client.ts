// src/core/openrouter-client.ts
import dotenv from 'dotenv';
import { TokenTracker } from './token-tracker';
import { Heartbeat } from './heartbeat';
import { normalizeResetTimestamp, sanitizeStoredBlockUntil } from './rate-limit';
import { Cache } from './cache';
import { ModelRouter, TaskType } from './model-router';
import * as fs from 'fs/promises';
import * as path from 'path';

dotenv.config();

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  task?: TaskType;
  useCache?: boolean;
  model?: string;
}

export interface ChatResult {
  content: string;
  model: string;
  usage?: TokenUsage;
}

interface KeyStatus {
  key: string;
  blockedUntil: number; // timestamp в миллисекундах, до которого ключ заблокирован
}

export class OpenRouterClient {
  private apiKeys: string[];
  private keyStatuses: KeyStatus[];
  private defaultModel: string;
  private fallbackModels: string[];
  private timeoutMs: number;
  private tracker: TokenTracker;
  private statusFile: string;
  private cache: Cache;
  private modelRouter: ModelRouter;

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

    this.defaultModel = defaultModel;
    this.fallbackModels = fallbackModels;
    this.timeoutMs = timeoutMs;
    this.tracker = new TokenTracker();
    this.statusFile = path.join(process.cwd(), 'key-status.json');
    this.cache = new Cache();
    this.modelRouter = new ModelRouter();

    // Загружаем статусы ключей из файла (если есть)
    this.keyStatuses = [];
    this.loadKeyStatuses().then(() => {
      console.log(`[OpenRouter] Загружено ключей: ${this.apiKeys.length}`);
      console.log(`[OpenRouter] Модели теперь выбираются по задаче (task) — см. src/core/model-router.ts`);
      console.log(`[OpenRouter] Общий запасной список (для вызовов без task): ${this.fallbackModels.join(', ')}`);
    });
  }

  private async loadKeyStatuses() {
    try {
      const data = await fs.readFile(this.statusFile, 'utf-8');
      const saved = JSON.parse(data);
      if (Array.isArray(saved)) {
        this.keyStatuses = saved;
        this.keyStatuses = this.keyStatuses.filter(ks => this.apiKeys.includes(ks.key));
        // Санитизируем уже сохранённые значения: если баг парсинга (см. P0-6) успел
        // записать в файл нереалистично далёкий blockedUntil (например, на ~56000 лет),
        // обрезаем его до разумной верхней границы вместо того, чтобы ключ навсегда
        // считался заблокированным.
        let sanitizedAny = false;
        for (const ks of this.keyStatuses) {
          const sanitized = sanitizeStoredBlockUntil(ks.blockedUntil);
          if (sanitized !== ks.blockedUntil) {
            console.warn(`⚠️ Обнаружен некорректный blockedUntil для ключа (было: ${ks.blockedUntil}), исправлено на: ${sanitized}`);
            ks.blockedUntil = sanitized;
            sanitizedAny = true;
          }
        }
        if (sanitizedAny) {
          await this.saveKeyStatuses();
        }
      }
    } catch {
      this.keyStatuses = this.apiKeys.map(key => ({ key, blockedUntil: 0 }));
    }
  }

  private async saveKeyStatuses() {
    try {
      await fs.writeFile(this.statusFile, JSON.stringify(this.keyStatuses, null, 2), 'utf-8');
    } catch (e) {
      // игнорируем ошибки записи
    }
  }

  private isKeyBlocked(key: string): boolean {
    const status = this.keyStatuses.find(ks => ks.key === key);
    if (!status) return false;
    return status.blockedUntil > Date.now();
  }

  private blockKey(key: string, resetTimestamp?: number) {
    const status = this.keyStatuses.find(ks => ks.key === key);
    const blockUntil = resetTimestamp || (Date.now() + 24 * 60 * 60 * 1000);
    if (status) {
      status.blockedUntil = blockUntil;
    } else {
      this.keyStatuses.push({ key, blockedUntil: blockUntil });
    }
    this.saveKeyStatuses();
  }

  private async chatWithRetry(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    tools: any[] | undefined,
    key: string
  ): Promise<ChatResult> {
    this.tracker.trackRequest();

    const stopHeartbeat = Heartbeat.start(`Запрос к ${model} (ключ #${this.apiKeys.indexOf(key) + 1})`);
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

      const data: any = await resp.json();
      if (!resp.ok) {
        if (resp.status === 429) {
          // === ОБРАБОТКА ДАТЫ СБРОСА (централизованная, с верхней границей) ===
          const resetHeader = resp.headers.get('x-ratelimit-reset');
          let resetTimestamp = normalizeResetTimestamp(resetHeader);
          if (resetTimestamp) {
            console.log(`   🔄 Заголовок x-ratelimit-reset: ${resetHeader} -> ${new Date(resetTimestamp).toLocaleString()}`);
          }
          // Если не удалось получить reset, блокируем на 24 часа
          if (!resetTimestamp) {
            resetTimestamp = Date.now() + 24 * 60 * 60 * 1000;
            console.log(`   ⚠️ Не удалось получить время сброса, блокируем на 24 часа`);
          }
          this.blockKey(key, resetTimestamp);
          const resetDate = resetTimestamp ? new Date(resetTimestamp).toLocaleString() : 'неизвестно';
          throw new Error(`429: Лимит запросов для модели ${model} исчерпан. Сброс: ${resetDate}. Ключ заблокирован до сброса.`);
        }
        if (resp.status === 401) {
          this.blockKey(key, Date.now() + 365 * 24 * 60 * 60 * 1000);
          throw new Error('401: Неверный API-ключ (User not found). Ключ заблокирован.');
        }
        if (resp.status === 404) {
          throw new Error(`404: Модель ${model} не найдена.`);
        }
        throw new Error(`API ошибка (${resp.status}): ${JSON.stringify(data)}`);
      }

      const content = data.choices?.[0]?.message?.content || '';

      // P2: логируем finish_reason — если модель обрезала ответ по лимиту токенов
      // (finish_reason === 'length'), это важно видеть явно, а не молча получать
      // усечённый JSON и гадать, почему парсинг не удался.
      const finishReason = data.choices?.[0]?.finish_reason;
      if (finishReason && finishReason !== 'stop') {
        console.warn(`⚠️ finish_reason: "${finishReason}" (модель: ${model})${finishReason === 'length' ? ' — ответ обрезан по лимиту maxTokens!' : ''}`);
      }

      // === P1-7: реальный учёт токенов (вместо всегда-0 context.tokenUsage) ===
      let usage: TokenUsage | undefined;
      if (data.usage) {
        const promptTokens = data.usage.prompt_tokens ?? 0;
        const completionTokens = data.usage.completion_tokens ?? 0;
        const totalTokens = data.usage.total_tokens ?? (promptTokens + completionTokens);
        usage = { promptTokens, completionTokens, totalTokens };
        this.tracker.trackTokens(totalTokens);
      }

      return { content, model: data.model || model, usage };
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
  ): Promise<ChatResult> {
    // === P1-2: маршрутизация по task/options.model ===
    // Если задан task — берём temperature/maxTokens по умолчанию из ModelRouter,
    // но explicit options.temperature/options.maxTokens всегда имеют приоритет.
    const taskConfig = options.task ? this.modelRouter.getConfig(options.task) : undefined;
    const model = options.model || this.defaultModel;
    const temperature = options.temperature ?? taskConfig?.temperature ?? 0.5;
    const maxTokens = options.maxTokens ?? taskConfig?.maxTokens ?? 4096;

    // === P1-1: кеширование ===
    // useCache читается явно (по умолчанию выключено) — так и раньше вызывали
    // агенты: параметр либо true, либо false, но нигде не обрабатывался.
    const useCache = options.useCache === true;
    if (useCache) {
      const cachedRaw = await this.cache.get(messages, model, temperature);
      if (cachedRaw !== null) {
        try {
          const cached: ChatResult = JSON.parse(cachedRaw);
          console.log(`💾 Ответ найден в кеше (модель: ${cached.model}), реальный запрос пропущен`);
          return cached;
        } catch {
          // повреждённая запись кеша — игнорируем и делаем реальный запрос
        }
      }
    }

    // === P1-2 (реальный фикс, не только конфиг): маршрутизация по task ===
    // Раньше здесь ВСЕГДА использовался общий this.fallbackModels независимо
    // от task — ModelRouter.getConfig(task) вызывался только ради
    // temperature/maxTokens, а список моделей для реального перебора он не
    // влиял вообще. Теперь: если явно передана options.model — пробуем её
    // первой, затем модели, релевантные задаче (task); если task не передан —
    // используем общий список (обратная совместимость для вызовов без task).
    const taskModels = taskConfig?.models;
    const baseModels = taskModels && taskModels.length > 0 ? taskModels : this.fallbackModels;
    const modelsToTry = options.model
      ? [options.model, ...baseModels.filter(m => m !== options.model)]
      : baseModels;

    for (let ki = 0; ki < this.apiKeys.length; ki++) {
      const key = this.apiKeys[ki];

      if (this.isKeyBlocked(key)) {
        const status = this.keyStatuses.find(ks => ks.key === key);
        const until = status?.blockedUntil ? new Date(status.blockedUntil).toLocaleString() : 'неизвестно';
        console.log(`⏭️ Ключ #${ki+1} заблокирован до ${until}. Пропускаем.`);
        continue;
      }

      let keyError = false;

      for (let mi = 0; mi < modelsToTry.length; mi++) {
        const m = modelsToTry[mi];
        try {
          console.log(`🤖 Пробуем модель: ${m} (ключ #${ki + 1})`);
          const result = await this.chatWithRetry(messages, m, temperature, maxTokens, options.tools, key);
          if (useCache) {
            await this.cache.set(messages, model, temperature, JSON.stringify(result));
          }
          return result;
        } catch (err: any) {
          if (err.message.includes('429') || err.message.includes('401')) {
            console.warn(`⚠️ Ключ #${ki + 1} дал ошибку: ${err.message.split(':')[0]}. Переключаем на следующий ключ.`);
            keyError = true;
            break;
          } else if (err.message.includes('404')) {
            console.warn(`⚠️ Модель ${m} недоступна. Пробуем следующую...`);
            continue;
          } else {
            console.warn(`⚠️ Ошибка на модели ${m}: ${err.message}. Пробуем следующую...`);
            continue;
          }
        }
      }

      if (keyError) {
        continue;
      }

      console.warn(`⚠️ Все модели для ключа #${ki + 1} недоступны. Пробуем следующий ключ...`);
    }

    throw new Error('Все ключи исчерпали лимит или невалидны. Попробуйте позже или добавьте новые ключи.');
  }
}