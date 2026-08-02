// src/agents/code-agent.ts
import { BaseAgent } from './base-agent';
import { AgentContext, GameDesign, GameCode } from '../types';
import { cleanJson } from '../tools/json-cleaner';
import { buildCodePrompt } from '../tools/prompt-builder';

export class CodeAgent extends BaseAgent {
  async run(context: AgentContext): Promise<GameCode> {
    if (!context.design) {
      throw new Error('Дизайн игры не передан в контекст');
    }

    const design = context.design;
    let snippets = '';
    if (context.searchEnabled && this.tavily) {
      const searchQuery = `Phaser 3 TypeScript код 2D игры ${design.scenes.map(s => s.name).join(' ')}`;
      snippets = await this.search(searchQuery);
    }

    const prompt = buildCodePrompt(design, snippets);
    const systemPrompt = `Ты — опытный разработчик на Phaser 3 + TypeScript. Сгенерируй полный код 2D-игры в формате JSON с полем files (массив {path, content}). Учти интеграцию с YSdk.`;

    const response = await this.openRouter.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      {
        task: 'coding',
        temperature: 0.3,
        useCache: true,
        maxTokens: 24000,
      }
    );

    const cleaned = cleanJson(response.content);
    const code = JSON.parse(cleaned) as GameCode;
    return code;
  }
}