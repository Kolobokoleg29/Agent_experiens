// src/agents/review-agent.ts
import { BaseAgent } from './base-agent';
import { PipelineContext, ReviewResult, GameCode } from '../types';
import { validateCode } from '../tools/code-validator';
import { parseJsonWithRecovery } from '../tools/json-cleaner';
import { GameCodeSchema, validateDto } from '../schemas';

const MAX_FIX_ATTEMPTS = 3;

export class ReviewAgent extends BaseAgent {
  async run(context: PipelineContext): Promise<PipelineContext> {
    console.log('🔍 Ревью кода...');

    if (!context.code) {
      throw new Error('Код не сгенерирован. Сначала выполните CodeAgent.');
    }

    try {
      const review = await this.review(context.code, context);
      context.review = review;
      this.updateContext(context, `Review completed: ${review.passed ? 'PASS' : 'FAIL'}`);
      console.log(`📊 Ревью: ${review.passed ? '✅ пройдено' : '❌ ошибки'}`);
      if (!review.passed) {
        console.log(`   Ошибок: ${review.errors.length}`);
        if (review.fixes) {
          console.log('   🔧 Исправленный код сохранён в контексте');
          context.code = review.fixes; // обновляем код на исправленный
        }
      }
      return context;
    } catch (error) {
      console.error('❌ Ошибка в ReviewAgent:', error);
      context.errors.push(`ReviewAgent: ${error}`);
      throw error;
    }
  }

  private async review(code: GameCode, context: PipelineContext): Promise<ReviewResult> {
    // 1. Валидация через tsc (детерминированная проверка)
    const validationErrors = await validateCode(code);

    if (validationErrors.length === 0) {
      return { passed: true, errors: [], warnings: [] };
    }

    console.warn(`⚠️ Найдено ${validationErrors.length} ошибок TypeScript. Пытаемся исправить через LLM...`);

    // 2. Цикл "исправить -> перепроверить" до MAX_FIX_ATTEMPTS попыток.
    // На каждой итерации модели передаётся актуальный список ОСТАВШИХСЯ ошибок
    // (а не всегда исходный список), чтобы она не пыталась переисправить то,
    // что уже было исправлено на предыдущем шаге.
    let currentCode = code;
    let currentErrors = validationErrors;

    for (let attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
      console.log(`🔧 Попытка исправления ${attempt}/${MAX_FIX_ATTEMPTS} (ошибок: ${currentErrors.length})...`);

      const response = await this.callWithRetry(
        async () => {
          return await this.openRouter.chat(
            [
              { role: 'system', content: 'Ты — эксперт по TypeScript и Phaser 3. Исправь ошибки в коде.' },
              { role: 'user', content: this.buildFixPrompt(currentCode, currentErrors) },
            ],
            {
              task: 'review',
              temperature: 0.2,
              useCache: false,
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

      if (!response?.content) {
        console.warn(`   Попытка ${attempt}: модель вернула пустой ответ, переходим к следующей попытке`);
        continue;
      }

      console.log('📝 Сырой ответ модели (первые 200 символов):', response.content.substring(0, 200) + '...');

      // P1-7: реальный учёт токенов вместо всегда-0 context.tokenUsage
      if (response.usage) {
        context.tokenUsage = (context.tokenUsage || 0) + response.usage.totalTokens;
      }

      let fixedCode: GameCode;
      try {
        const raw = parseJsonWithRecovery<unknown>(response.content);
        fixedCode = validateDto(GameCodeSchema, raw, 'GameCode');
        console.log('✅ Парсинг исправленного кода успешен');
      } catch (parseError: any) {
        console.error(`   Попытка ${attempt}: ошибка парсинга исправленного кода:`, parseError.message);
        continue; // пробуем следующую попытку, currentCode/currentErrors не меняем
      }

      // 3. Повторно проверяем исправленный код
      const recheckErrors = await validateCode(fixedCode);
      if (recheckErrors.length === 0) {
        console.log(`✅ Код полностью исправлен за ${attempt} попытку(и)`);
        return { passed: true, errors: [], warnings: [], fixes: fixedCode };
      }

      console.warn(`   Попытка ${attempt}: осталось ${recheckErrors.length} ошибок из ${currentErrors.length}`);
      currentCode = fixedCode;
      currentErrors = recheckErrors;
    }

    console.error(`❌ Не удалось полностью исправить код за ${MAX_FIX_ATTEMPTS} попыток, осталось ${currentErrors.length} ошибок`);
    // Возвращаем последнюю (частично исправленную) версию кода как fixes,
    // чтобы хотя бы частичный прогресс не терялся — но passed остаётся false.
    return { passed: false, errors: currentErrors, warnings: [], fixes: currentCode !== code ? currentCode : undefined };
  }

  private buildFixPrompt(code: GameCode, errors: string[]): string {
    return `
Ты — senior TypeScript/Phaser 3 разработчик. Твоя задача — исправить ошибки в коде.

Ошибки, найденные компилятором:
${errors.join('\n')}

Вот код всех файлов:
${JSON.stringify(code, null, 2)}

Правила:
1. Исправляй только ошибки, не меняй логику, если это не требуется для исправления.
2. Добавляй недостающие импорты, исправляй синтаксис.
3. Исправляй ошибки типов TypeScript (any → конкретные типы).
4. Убедись, что все сцены правильно регистрируются в конфиге игры.
5. Если ошибка связана с отсутствием метода/свойства в Phaser, используй
   актуальное публичное API Phaser 3 по своим знаниям — у тебя нет доступа к
   поиску в этом вызове, не выдумывай методы, которых не существует.
6. Верни исправленный код в том же формате JSON: { files: [ { path, content } ] }.
7. После исправлений код должен компилироваться без ошибок.
`;
  }
}