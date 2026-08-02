// src/agents/niche-hunter.ts
import { BaseAgent } from './base-agent';
import { cleanJson } from '../tools/json-cleaner';
import { NicheIdea, MarketData } from '../types';

export class NicheHunter extends BaseAgent {
  async findNiches(marketData: MarketData): Promise<NicheIdea[]> {
    console.log('🎯 Поиск перспективных ниш...');

    const prompt = `
      На основе анализа рынка Яндекс Игр:
      ${JSON.stringify(marketData, null, 2)}

      Найди 5-7 перспективных ниш для казуальных/мидкорных игр.

      Критерии поиска (метод из GameConf 2025):
      1. Зарождение — 1-2 игры в нише (не перенасыщена)
      2. Нет волны клонов (CPI ещё не вырос)
      3. Есть потенциал для монетизационного сдвига (можно добавить IAP)

      Для каждой ниши укажи:
      - name: название
      - description: описание
      - whyBlueOcean: почему это "голубой океан"
      - existingGames: примеры существующих игр (массив строк)
      - potentialMechanics: потенциальная механика
      - complexity: оценка сложности реализации (1-10)
      - monetizationPotential: потенциал монетизации (1-10)

      Верни строго JSON-массив объектов.
    `;

    const systemPrompt = 'Ты — эксперт по поиску игровых ниш. Отвечай только валидным JSON.';

    // Используем задачу 'simple' и кеширование
    const response = await this.openRouter.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      {
        task: 'simple',
        temperature: 0.5,
        useCache: true,
      }
    );

    console.log('📝 Сырой ответ модели (первые 200 символов):', response.content.substring(0, 200) + '...');

    try {
      const cleaned = cleanJson(response.content);
      console.log('🧹 Очищенный JSON (первые 200 символов):', cleaned.substring(0, 200) + '...');
      const result = JSON.parse(cleaned);
      console.log('✅ Парсинг JSON успешен');
      return result;
    } catch (parseError) {
      console.error('❌ Ошибка парсинга JSON. Полный сырой ответ:', response.content);
      throw parseError;
    }
  }
}