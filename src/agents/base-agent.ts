// src/agents/base-agent.ts

import { AgentContext } from '../types';
import { OpenRouterClient } from '../core/openrouter-client';
import { TavilyClient } from '../core/tavily-client';
import { Heartbeat } from '../core/heartbeat';

export abstract class BaseAgent {
  protected openRouter: OpenRouterClient;
  protected tavily?: TavilyClient;
  protected heartbeat: Heartbeat;

  constructor(openRouter: OpenRouterClient, tavily?: TavilyClient) {
    this.openRouter = openRouter;
    this.tavily = tavily;
    this.heartbeat = new Heartbeat();
  }

  // Основной метод, который должны реализовать наследники
  abstract run(context: AgentContext): Promise<any>;

  // Вспомогательный метод для вызова LLM с обработкой ошибок и heartbeat
  protected async callLLM(
    prompt: string,
    systemPrompt?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    this.heartbeat.start();
    try {
      const response = await this.openRouter.chat({
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        ...options,
      });
      return response.content;
    } finally {
      this.heartbeat.stop();
    }
  }

  // Поиск в интернете (если включён)
  protected async search(query: string): Promise<string> {
    if (!this.tavily) {
      throw new Error('Tavily API not configured');
    }
    return this.tavily.search(query);
  }
}