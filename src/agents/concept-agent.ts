// src/agents/concept-agent.ts
import { BaseAgent } from './base-agent';
import { PipelineContext, GameConcept } from '../types';
import { GameConceptSchema, validateDto } from '../schemas';
import { parseJsonWithRecovery } from '../tools/json-cleaner';
import { buildConceptPrompt, NichePromptContext } from '../tools/prompt-builder';

export class ConceptAgent extends BaseAgent {
  async run(context: PipelineContext): Promise<PipelineContext> {
    console.log('🧠 Генерация концепции...');

    if (!context.selectedNiche) {
      throw new Error('Ниша не выбрана. Сначала выполните NicheHunter.');
    }

    try {
      const feedbackNote = context.validation && context.validation.verdict !== 'approved'
        ? `

ВАЖНО: предыдущая попытка концепции была отклонена (вердикт: "${context.validation.verdict}").
Главные риски прошлой концепции: ${context.validation.risks.join('; ') || 'не указаны'}.
Рекомендованные улучшения: ${context.validation.improvements.join('; ') || 'не указаны'}.
Альтернативные механики на рассмотрение: ${context.validation.alternatives.join('; ') || 'не указаны'}.
Учти эту обратную связь и предложи заметно ДРУГУЮ или значительно доработанную концепцию — не повторяй прошлые ошибки.`
        : '';

      // P4: раньше сюда шло только selectedNiche.description — name,
      // whyBlueOcean, potentialMechanics и existingGames терялись, из-за
      // чего концепция могла уйти в сторону от выбранной ниши. Теперь ниша
      // передаётся в buildConceptPrompt целиком и отдельно от свободного
      // пожелания пользователя.
      const niche: NichePromptContext = {
        name: context.selectedNiche.name,
        description: context.selectedNiche.description,
        whyBlueOcean: context.selectedNiche.whyBlueOcean,
        potentialMechanics: context.selectedNiche.potentialMechanics,
        existingGames: context.selectedNiche.existingGames,
      };

      const userWish = (context.userPrompt || '(пожеланий нет — ориентируйся на нишу)') + feedbackNote;

      let searchResults = '';
      if (context.searchEnabled && this.tavily) {
        searchResults = await this.tavily.search(`популярные 2D казуальные игры на Phaser 3 Яндекс Игры`);
      }

      const prompt = buildConceptPrompt(niche, userWish, searchResults);
      const systemPrompt = `Ты — опытный геймдизайнер. Создай концепцию 2D-игры в формате JSON. Обязательно: игра должна быть строго 2D. Используй только двойные кавычки для строк.`;

      // === Используем централизованный ретрай ===
      const response = await this.callWithRetry(
        async () => {
          return await this.openRouter.chat(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            {
              task: 'reasoning',
              temperature: 0.8,
              useCache: true,
              maxTokens: 32768,
            }
          );
        },
        {
          maxAttempts: 3,
          baseDelay: 1000,
          retryableErrors: ['429', '500', '502', '503', '504'],
        }
      );

      console.log('📝 Сырой ответ модели (первые 300 символов):', response.content.substring(0, 300));

      // P1-7: реальный учёт токенов вместо всегда-0 context.tokenUsage
      if (response.usage) {
        context.tokenUsage = (context.tokenUsage || 0) + response.usage.totalTokens;
      }

      // Парсинг с фолбэками (единая функция вместо самописного псевдо-retry)
      let concept: GameConcept;
      try {
        const raw = parseJsonWithRecovery<unknown>(response.content);
        concept = validateDto(GameConceptSchema, raw, 'GameConcept');
        console.log('✅ Парсинг JSON успешен');
      } catch (parseError: any) {
        console.error('❌ Ошибка парсинга JSON:', parseError.message);
        throw new Error(`Не удалось сгенерировать концепцию: не удалось распарсить ответ модели: ${parseError.message}`);
      }

      context.concept = concept;
      this.updateContext(context, 'Concept generation completed');
      console.log(`✅ Концепция "${concept.title}" сгенерирована`);
      return context;
    } catch (error) {
      console.error('❌ Ошибка в ConceptAgent:', error);
      context.errors.push(`ConceptAgent: ${error}`);
      throw error;
    }
  }
}