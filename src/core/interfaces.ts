// src/core/interfaces.ts
//
// Узкие интерфейсы для LLM- и поискового клиента. Раньше BaseAgent жёстко
// зависел от конкретных классов OpenRouterClient/TavilyClient — это делало
// написание юнит-тестов для агентов неудобным (пришлось бы поднимать реальный
// клиент или полагаться на приведение типов через any). Конкретные классы
// уже структурно соответствуют этим интерфейсам, так что это чисто
// расширение типов, без изменения поведения.
import { ChatMessage, ChatOptions, ChatResult } from './openrouter-client';

export interface ILLMClient {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
}

export interface ISearchClient {
  search(query: string, maxResults?: number): Promise<string>;
}
