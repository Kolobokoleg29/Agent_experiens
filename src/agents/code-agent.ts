// src/agents/code-agent.ts
import { BaseAgent } from './base-agent';
import { PipelineContext, GameCode } from '../types';
import { GameCodeSchema, validateDto } from '../schemas';
import { cleanJson, parseJsonWithRecovery } from '../tools/json-cleaner';
import { buildCodePrompt } from '../tools/prompt-builder';
import { validateCode } from '../tools/code-validator';

export class CodeAgent extends BaseAgent {
  async run(context: PipelineContext): Promise<PipelineContext> {
    console.log('💻 Генерация кода...');

    if (!context.gdd) {
      throw new Error('GDD не сгенерирован. Сначала выполните GameArchitect.');
    }

    try {
      const design = context.gdd;
      let snippets = '';
      if (context.searchEnabled && this.tavily) {
        const scenes = design.technicalArchitecture?.scenes || [];
        const searchQuery = `Phaser 3 TypeScript код 2D игры ${scenes.join(' ')}`;
        snippets = await this.search(searchQuery);
      }

      const prompt = buildCodePrompt(design, snippets, context.economy, context.production, context.assets);
      const systemPrompt = `Ты — опытный разработчик на Phaser 3 + TypeScript. Сгенерируй полный код 2D-игры в формате JSON с полем files (массив {path, content}). Учти интеграцию с YSdk. В коде используй только экранированные символы, избегай управляющих символов в строках.`;

      const response = await this.callWithRetry(
        async () => {
          return await this.openRouter.chat(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            {
              task: 'coding',
              temperature: 0.3,
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

      if (!response?.content) {
        throw new Error('Модель вернула пустой ответ');
      }

      console.log('📝 Сырой ответ модели (первые 200 символов):', response.content.substring(0, 200) + '...');

      // P1-7: реальный учёт токенов вместо всегда-0 context.tokenUsage
      if (response.usage) {
        context.tokenUsage = (context.tokenUsage || 0) + response.usage.totalTokens;
      }

      let code: GameCode;
      try {
        code = this.parseCodeJson(response.content);
        console.log('✅ Парсинг JSON успешен');
      } catch (parseError: any) {
        console.error('❌ Ошибка парсинга JSON:', parseError.message);
        throw new Error(`Не удалось извлечь код из ответа модели: ${parseError.message}`);
      }

      console.log('🔍 Проверка кода через TypeScript Compiler...');
      const errors = await validateCode(code);
      if (errors.length > 0) {
        console.warn(`⚠️ Найдено ${errors.length} ошибок TypeScript. Попробуем исправить автоматически...`);
        context.code = code;
        context.metrics.codeErrors = errors;
      } else {
        console.log('✅ Код синтаксически корректен');
        context.code = code;
      }

      if (context.saveState) {
        await context.saveState(context);
      }

      this.updateContext(context, 'Code generation completed');
      console.log(`✅ Сгенерировано ${code.files?.length || 0} файлов`);
      return context;
    } catch (error) {
      console.error('❌ Ошибка в CodeAgent:', error);
      context.errors.push(`CodeAgent: ${error}`);
      throw error;
    }
  }

  private parseCodeJson(text: string): GameCode {
    // Шаг 1 (специфичный именно для кода, поэтому оставлен отдельно от
    // общей parseJsonWithRecovery): предварительно ре-экранируем управляющие
    // символы (переносы строк, табы и т.д.) внутри JSON-строк. Тело игрового
    // кода почти всегда содержит реальные переносы строк внутри JSON-строковых
    // значений — без этого шага даже валидный ответ модели не распарсится.
    const cleaned = cleanJson(text);
    const preEscaped = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, str) => {
      const escaped = str
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/\f/g, '\\f')
        .replace(/\b/g, '\\b');
      return `"${escaped}"`;
    });

    // Шаг 2: остальное восстановление (прямой parse -> извлечение блока ->
    // жёсткий repair -> обрезание) — общая логика, одна на весь проект.
    const raw = parseJsonWithRecovery<unknown>(preEscaped);
    return validateDto(GameCodeSchema, raw, 'GameCode');
  }
}