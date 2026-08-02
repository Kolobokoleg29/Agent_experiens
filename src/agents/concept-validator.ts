// src/agents/concept-validator.ts
import { BaseAgent } from './base-agent';
import { cleanJson } from '../tools/json-cleaner';
import { GameConcept, ValidationResult } from '../types';

export class ConceptValidator extends BaseAgent {
  async validate(concept: GameConcept): Promise<ValidationResult> {
    console.log('🧠 Критический анализ концепции...');

    const prompt = `
      Проведи детальный критический анализ концепции 2D-игры:

      ${JSON.stringify(concept, null, 2)}

      Оцени по следующим критериям (каждый от 1 до 10):
      1. Уникальность — насколько отличается от существующих 2D-игр
      2. Реализуемость — можно ли сделать соло за 1-2 недели (2D-графика проще, чем 3D)
      3. Retention-потенциал — будет ли игрок возвращаться
      4. Монетизационный потенциал — можно ли добавить IAP
      5. Модерационная безопасность — риск отказа
      6. Рыночный спрос — есть ли аудитория для 2D-игр в этом жанре

      Также укажи:
      - Главные риски (массив строк)
      - Что можно улучшить (массив строк)
      - Альтернативные механики (массив строк)
      - Итоговый вердикт: "approved", "needs_work" или "rejected"

      Верни строго JSON в формате:
      {
        "scores": { "uniqueness": 8, "feasibility": 7, ... },
        "risks": ["риск 1", ...],
        "improvements": ["улучшение 1", ...],
        "alternatives": ["альтернатива 1", ...],
        "verdict": "approved"
      }
    `;

    const systemPrompt = 'Ты — строгий, но справедливый критик 2D-игровых концепций. Отвечай только валидным JSON.';

    const response = await this.openRouter.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      {
        task: 'reasoning',
        temperature: 0.5,
        useCache: true,
        maxTokens: 24000,
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