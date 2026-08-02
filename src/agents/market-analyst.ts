// src/agents/market-analyst.ts
import { BaseAgent } from './base-agent';
import { cleanJson } from '../tools/json-cleaner';
import { MarketData, PlatformInsights } from '../types';

export class MarketAnalyst extends BaseAgent {
  async run(): Promise<MarketData> {
    console.log('📊 Сбор данных о платформе Яндекс Игры...');
    try {
      const platformStats = await this.gatherPlatformStats();
      // Здесь можно добавить другие аналитические шаги
      // (анализ жанров, монетизации и т.д.)
      return { platformStats } as MarketData;
    } catch (error) {
      console.error('❌ Ошибка в MarketAnalyst:', error);
      throw error;
    }
  }

  private async gatherPlatformStats(): Promise<PlatformInsights> {
    const prompt = `
      Проанализируй платформу Яндекс Игры на основе следующих данных:
      
      - MAU: 50+ млн игроков в месяц (2025)
      - В каталоге ~19 тыс. игр (после чистки)
      - За 2025 год опубликовано 24 тыс., снято 29 тыс.
      - Топ-5 жанров: мидкор вошёл в топ-5
      - 40% игроков — из-за пределов СНГ
      - Рост выручки от IAP на 75% за год
      
      Сделай выводы:
      1. Какие жанры сейчас в тренде?
      2. Какие жанры перенасыщены?
      3. Где есть свободные ниши?
      
      Верни строго JSON с полями: trends (массив строк), saturated (массив строк), niches (массив строк).
    `;

    const systemPrompt = 'Ты — аналитик игрового рынка. Отвечай только валидным JSON.';

    const response = await this.openRouter.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ], { temperature: 0.3 });

    console.log('📝 Сырой ответ модели (первые 200 символов):', response.content.substring(0, 200) + '...');

    try {
      // Очищаем ответ от markdown-обёрток
      const cleaned = cleanJson(response.content);
      console.log('🧹 Очищенный JSON (первые 200 символов):', cleaned.substring(0, 200) + '...');
      
      // Парсим JSON
      const result = JSON.parse(cleaned);
      console.log('✅ Парсинг JSON успешен');
      return result;
    } catch (parseError) {
      console.error('❌ Ошибка парсинга JSON. Полный сырой ответ:', response.content);
      throw parseError;
    }
  }
}