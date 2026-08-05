// src/core/model-router.ts
//
// P1: раньше здесь была разметка задач (simple/reasoning/coding/review) с
// правильными temperature/maxTokens, но ПОЛЕ id было мёртвым кодом — везде
// стояло одно и то же 'openrouter/free', а openrouter-client.ts вообще не
// читал это поле при выборе модели (см. ниже, chat()). Из-за этого модель
// для ЛЮБОЙ задачи выбиралась одинаково — через мета-роутер openrouter/free,
// который сам решает, какая реальная модель обработает запрос. Отсюда
// ощущение "модель берётся случайно".
//
// Теперь вместо одного id — упорядоченный список models: [приоритетная
// модель под задачу, ..., запасные модели под ту же задачу, ..., openrouter/free
// как самый последний подстраховочный вариант]. openrouter-client.ts реально
// использует этот список при выборе, какую модель пробовать первой.

export type TaskType =
  | 'simple'          // быстрые аналитические ответы (рынок, ниши)
  | 'reasoning'       // требующие размышлений (концепция, дизайн, экономика, продакшн)
  | 'coding'          // генерация кода
  | 'review';         // ревью и рефакторинг

export interface ModelConfig {
  /** Упорядоченный список моделей под задачу: от приоритетной к запасным. */
  models: string[];
  maxTokens: number;
  temperature: number;
  contextWindow: number;
}

export class ModelRouter {
  private readonly models: Record<TaskType, ModelConfig> = {
    // MarketAnalyst, NicheHunter — короткие структурированные ответы,
    // не требующие глубоких рассуждений. Nemotron Ultra с 1M контекста
    // уже показал себя рабочим на этой задаче в реальных прогонах.
    simple: {
      models: [
        'nvidia/nemotron-3-ultra-550b-a55b:free',
        'nvidia/nemotron-3-super-120b-a12b:free',
        'google/gemma-4-31b-it:free',
        'openrouter/free',
      ],
      maxTokens: 8192,
      temperature: 0.3,
      contextWindow: 1000000,
    },

    // ConceptAgent, ConceptValidator, GameArchitect, EconomyAgent,
    // ProductionAgent — задачи, где важно именно рассуждение и удержание
    // структуры (баланс, зависимости между полями), а не только скорость.
    reasoning: {
      models: [
        'nvidia/nemotron-3-super-120b-a12b:free',
        'inclusionai/ling-3.0-flash:free',
        'nvidia/nemotron-3-ultra-550b-a55b:free',
        'poolside/laguna-s-2.1:free',
        'openrouter/free',
      ],
      maxTokens: 32768,
      temperature: 0.7,
      contextWindow: 262144,
    },

    // CodeAgent — единственная модель в списке, прямо позиционируемая как
    // code-модель, идёт первой; остальные — как запасные варианты с
    // адекватным контекстом под генерацию нескольких файлов игры.
    coding: {
      models: [
        'cohere/north-mini-code:free',
        'nvidia/nemotron-3-nano-30b-a3b:free',
        'openai/gpt-oss-20b:free',
        'poolside/laguna-xs-2.1:free',
        'openrouter/free',
      ],
      maxTokens: 32768,
      temperature: 0.2,
      contextWindow: 256000,
    },

    // ReviewAgent — умышленно ДРУГАЯ модель, чем CodeAgent: если код и
    // ревью пишет одна и та же модель, у неё меньше шансов заметить
    // собственную ошибку.
    review: {
      models: [
        'google/gemma-4-31b-it:free',
        'nvidia/nemotron-nano-12b-v2-vl:free',
        'cohere/north-mini-code:free',
        'openrouter/free',
      ],
      maxTokens: 32768,
      temperature: 0.1,
      contextWindow: 128000,
    },
  };

  getConfig(task: TaskType): ModelConfig {
    return this.models[task];
  }
}
