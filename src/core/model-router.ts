// src/core/model-router.ts

export type TaskType = 
  | 'simple'          // быстрые аналитические ответы, концепции
  | 'reasoning'       // требующие размышлений (дизайн, архитектура)
  | 'coding'          // генерация кода
  | 'review';         // ревью и рефакторинг

export interface ModelConfig {
  id: string;
  maxTokens: number;
  temperature: number;
  contextWindow: number;
}

export class ModelRouter {
  private readonly models: Record<TaskType, ModelConfig> = {
    simple: {
      id: 'openrouter/free',
      maxTokens: 4096,   // увеличено для длинных списков ниш
      temperature: 0.3,
      contextWindow: 8192,
    },
    reasoning: {
      id: 'openrouter/free',
      maxTokens: 4096,
      temperature: 0.7,
      contextWindow: 16384,
    },
    coding: {
      id: 'openrouter/free',
      maxTokens: 4096,
      temperature: 0.2,
      contextWindow: 32768,
    },
    review: {
      id: 'openrouter/free',
      maxTokens: 4096,
      temperature: 0.1,
      contextWindow: 32768,
    },
  };

  getConfig(task: TaskType): ModelConfig {
    return this.models[task];
  }
}