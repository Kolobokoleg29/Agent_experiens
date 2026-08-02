import { BaseAgent } from './base-agent';
import { AgentContext, GameCode, ReviewResult } from '../types';
import { validateCode } from '../tools/code-validator';
import { cleanJson } from '../tools/json-cleaner';

export class ReviewAgent extends BaseAgent {
  async run(context: AgentContext): Promise<ReviewResult> {
    if (!context.code) {
      throw new Error('Код для ревью не передан');
    }

    const code = context.code;

    // 1. Валидация через tsc (если доступен)
    const validationErrors = await validateCode(code);

    if (validationErrors.length === 0) {
      return { passed: true, errors: [], warnings: [] };
    }

    // 2. Если есть ошибки, пытаемся исправить через LLM
    const prompt = `
      Код игры на Phaser 3 содержит следующие ошибки TypeScript:
      ${validationErrors.join('\n')}
      
      Вот код:
      ${JSON.stringify(code, null, 2)}
      
      Исправь ошибки и верни полностью исправленный код в том же формате JSON.
    `;
    const systemPrompt = `Ты — эксперт по TypeScript и Phaser 3. Исправь ошибки в коде.`;

    const response = await this.openRouter.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      {
        task: 'review',
        temperature: 0.2,
        useCache: false, // обычно не кешируем ревью, так как код меняется
      }
    );

    const cleaned = cleanJson(response.content);
    const fixedCode = JSON.parse(cleaned) as GameCode;

    // 3. Повторно проверяем исправленный код
    const recheckErrors = await validateCode(fixedCode);
    const passed = recheckErrors.length === 0;

    return {
      passed,
      errors: recheckErrors,
      warnings: [],
      fixes: passed ? fixedCode : undefined,
    };
  }
}