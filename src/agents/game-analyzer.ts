import { BaseAgent } from './base-agent';
import { cleanJson } from '../tools/json-cleaner';

export class GameAnalyzer extends BaseAgent {
  async analyze(gameData: any): Promise<any> {
    const prompt = `
      Проведи детальный анализ игры для Яндекс Игр:
      
      ${JSON.stringify(gameData, null, 2)}
      
      Проанализируй:
      
      1. **Рыночный потенциал**
         - Размер аудитории
         - Конкуренция в жанре
         - Прогноз дохода
      
      2. **Игровой дизайн**
         - Сильные стороны
         - Слабые стороны
         - Что можно улучшить
      
      3. **Монетизация**
         - Оптимальные форматы
         - Потенциальный ARPU
         - Рекомендации по IAP
      
      4. **Техническая реализация**
         - Сложность на Phaser 3
         - Риски производительности
         - Требования к модерации
      
      5. **План продвижения**
         - Ключевые метрики для успеха (CTR, Playtime, Retention, ARPU)
         - Стратегия выхода
         - LiveOps план
      
      6. **SWOT-анализ**
    `;

    const response = await this.openRouter.chat(
      [
        { role: 'system', content: 'Ты — эксперт по анализу игровых проектов.' },
        { role: 'user', content: prompt },
      ],
      {
        task: 'reasoning',
        temperature: 0.5,
        useCache: true,
      }
    );

    const cleaned = cleanJson(response.content);
    return JSON.parse(cleaned);
  }
}