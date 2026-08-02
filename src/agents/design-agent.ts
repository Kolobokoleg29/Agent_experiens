// src/agents/design-agent.ts
import { BaseAgent } from './base-agent';
import { AgentContext, GameConcept, GameDesign } from '../types';
import { cleanJson } from '../tools/json-cleaner';
import { buildDesignPrompt } from '../tools/prompt-builder';

export class DesignAgent extends BaseAgent {
  async run(context: AgentContext): Promise<GameDesign> {
    if (!context.concept) {
      throw new Error('Концепция игры не передана в контекст');
    }

    const concept = context.concept;
    let docs = '';
    if (context.searchEnabled && this.tavily) {
      const searchQuery = `Phaser 3 пример 2D игры ${concept.genre} сцены объекты`;
      docs = await this.search(searchQuery);
    }

    const prompt = buildDesignPrompt(concept, docs);
    const systemPrompt = `Ты — архитектор 2D-игр на Phaser 3. Разработай детальный дизайн 2D-игры в формате JSON.`;

    const response = await this.openRouter.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      {
        task: 'reasoning',
        temperature: 0.7,
        useCache: true,
        maxTokens: 24000,
      }
    );

    const cleaned = cleanJson(response.content);
    const design = JSON.parse(cleaned) as GameDesign;
    return design;
  }
}