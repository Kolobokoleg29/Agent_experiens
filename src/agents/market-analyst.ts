// src/agents/market-analyst.ts
import { BaseAgent } from './base-agent';
import { parseJsonWithRecovery } from '../tools/json-cleaner';
import { PipelineContext, MarketData, PlatformInsights } from '../types';
import { wrapExternalContent } from '../tools/sanitize';

export class MarketAnalyst extends BaseAgent {
  async run(context: PipelineContext): Promise<PipelineContext> {
    console.log('📊 Сбор данных о платформе Яндекс Игры...');
    try {
      const platformStats = await this.gatherPlatformStats(context);
      context.market = { platformStats } as MarketData;
      this.updateContext(context, 'Market analysis completed');
      return context;
    } catch (error) {
      console.error('❌ Ошибка в MarketAnalyst:', error);
      context.errors.push(`MarketAnalyst: ${error}`);
      throw error;
    }
  }

  private async gatherPlatformStats(context: PipelineContext): Promise<PlatformInsights> {
    // Раньше здесь были захардкожены цифры 2025 года как "факт", и модель
    // просто пересказывала их без единого реального запроса — вся цепочка
    // Niche/Concept дальше росла из непроверенных чисел. Теперь, если
    // поиск включён и Tavily настроен, тянем реальные свежие данные и
    // передаём их как непроверенный внешний контент (wrapExternalContent),
    // а не как готовый факт. Старые вшитые цифры оставлены как fallback
    // на случай, если поиск недоступен/выключен — с явной пометкой, что
    // это ориентир, а не подтверждённые данные.
    let searchResults = '';
    if (context.searchEnabled && this.tavily) {
      try {
        const queries = [
          'Яндекс Игры MAU статистика 2026',
          'Яндекс Игры тренды жанров казуальные игры 2026',
        ];
        const results = await Promise.all(queries.map((q) => this.search(q)));
        searchResults = results.join('\n\n---\n\n');
      } catch (searchError) {
        console.warn('⚠️ Не удалось получить данные через Tavily, используем fallback-оценки:', searchError);
      }
    }

    const fallbackNote = searchResults
      ? ''
      : `
      Поиск недоступен/выключен — ниже приблизительные ориентировочные цифры
      (НЕ проверенные актуальные данные, а грубая оценка порядка величины,
      относись к ним соответственно и не выдавай как точный факт):
      - MAU: десятки миллионов игроков в месяц
      - Каталог из десятков тысяч игр
      - Мидкор в топе жанров, растущая доля IAP в выручке
      - Значительная доля игроков из-за пределов СНГ
      `;

    const prompt = `
      Проанализируй платформу Яндекс Игры на основе данных ниже.

      ${wrapExternalContent('результаты веб-поиска о платформе Яндекс Игры', searchResults)}
      ${fallbackNote}

      Важно: Яндекс Игры — это в первую очередь БРАУЗЕРНАЯ платформа, основная
      аудитория заходит с ПК и играет мышью и клавиатурой (мобильная версия —
      вторичная адаптация). Учитывай это при выводах о жанрах и нишах — не
      предполагай по умолчанию мобильный тач-геймплей.

      Сделай выводы:
      1. Какие жанры сейчас в тренде?
      2. Какие жанры перенасыщены?
      3. Где есть свободные ниши?

      Если результаты поиска не дают точных цифр — не выдумывай точные числа,
      формулируй выводы качественно ("растущий сегмент" вместо точного %).

      Верни строго JSON с полями: trends (массив строк), saturated (массив строк), niches (массив строк).
    `;

    const systemPrompt = 'Ты — аналитик игрового рынка. Отвечай только валидным JSON.';

    // === ИСПОЛЬЗУЕМ ЦЕНТРАЛИЗОВАННЫЙ РЕТРАЙ ===
    const response = await this.callWithRetry(
      async () => {
        return await this.openRouter.chat(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          {
            task: 'simple',
            temperature: 0.3,
            useCache: true,
            maxTokens: 8192,
          }
        );
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        retryableErrors: ['429', '500', '502', '503', '504'],
      }
    );

    console.log('📝 Сырой ответ модели (первые 200 символов):', response.content.substring(0, 200) + '...');

    // P1-7: реальный учёт токенов вместо всегда-0 context.tokenUsage
    if (response.usage) {
      context.tokenUsage = (context.tokenUsage || 0) + response.usage.totalTokens;
    }

    // === ПАРСИНГ С ФОЛБЭКАМИ (единая функция вместо самописного псевдо-retry) ===
    try {
      const result = parseJsonWithRecovery<PlatformInsights>(response.content);
      console.log('✅ Парсинг JSON успешен');
      return result;
    } catch (parseError: any) {
      console.error('❌ Ошибка парсинга JSON:', parseError.message);
      throw new Error(`Не удалось распарсить ответ модели: ${parseError.message}`);
    }
  }
}