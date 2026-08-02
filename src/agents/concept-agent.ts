// src/agents/concept-agent.ts
import { BaseAgent } from './base-agent';
import { AgentContext, GameConcept } from '../types';
import { cleanJson } from '../tools/json-cleaner';
import { buildConceptPrompt } from '../tools/prompt-builder';

export class ConceptAgent extends BaseAgent {
  async run(context: AgentContext): Promise<GameConcept> {
    const userPrompt = context.userPrompt || 'Придумай простую казуальную 2D-игру для Яндекс Игр.';

    let searchResults = '';
    if (context.searchEnabled && this.tavily) {
      searchResults = await this.tavily.search(`популярные 2D казуальные игры на Phaser 3 Яндекс Игры`);
    }

    const prompt = buildConceptPrompt(userPrompt, searchResults);
    const systemPrompt = `Ты — опытный геймдизайнер. Создай концепцию 2D-игры в формате JSON. Обязательно: игра должна быть строго 2D. Используй только двойные кавычки для строк.`;

    const response = await this.openRouter.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      {
        task: 'reasoning',
        temperature: 0.8,
        useCache: true,
        maxTokens: 24002,
      }
    );

    console.log('📝 Сырой ответ модели (первые 300 символов):', response.content.substring(0, 300));

    try {
      const cleaned = cleanJson(response.content);
      console.log('🧹 Очищенный JSON (первые 300 символов):', cleaned.substring(0, 300));
      const concept = JSON.parse(cleaned) as GameConcept;
      console.log('✅ Парсинг JSON успешен');
      return concept;
    } catch (parseError: any) {
      console.error('❌ Ошибка парсинга JSON. Полный сырой ответ:', response.content);
      console.error('❌ Ошибка:', parseError.message);
      // Попытка извлечь JSON вручную через регулярное выражение
      const fallbackMatch = response.content.match(/\{[\s\S]*\}/);
      if (fallbackMatch) {
        try {
          console.log('🔄 Пробуем извлечь JSON через fallback...');
          const fallbackJson = JSON.parse(fallbackMatch[0]);
          return fallbackJson as GameConcept;
        } catch {
          // Ничего не делаем
        }
      }
      throw new Error(`Не удалось распарсить ответ модели: ${parseError.message}`);
    }
  }
}