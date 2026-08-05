// src/agents/base-agent.ts
import { PipelineContext } from '../types';
import { ILLMClient, ISearchClient } from '../core/interfaces';
import { withRetry, RetryOptions } from '../services/retry.service';

export abstract class BaseAgent {
  protected openRouter: ILLMClient;
  protected tavily?: ISearchClient;

  constructor(openRouter: ILLMClient, tavily?: ISearchClient) {
    this.openRouter = openRouter;
    this.tavily = tavily;
  }

  abstract run(context: PipelineContext): Promise<PipelineContext>;

  protected async search(query: string): Promise<string> {
    if (!this.tavily) {
      throw new Error('Tavily API not configured');
    }
    return this.tavily.search(query);
  }

  protected updateContext(context: PipelineContext, step: string): void {
    context.updatedAt = new Date();
    context.history.push(step);
  }

  /**
   * Централизованный метод для вызова с повторными попытками
   */
  protected async callWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    return withRetry(fn, {
      maxAttempts: 3,
      baseDelay: 1000,
      ...options,
      onRetry: (attempt, error, delay) => {
        console.warn(`⚠️ Ошибка: ${error.message}. Повторная попытка ${attempt}/${options.maxAttempts || 3} через ${delay}мс...`);
      },
    });
  }
}