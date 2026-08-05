// src/stages/concept-stage.ts
import { BaseStage } from './base-stage';
import { ConceptAgent } from '../agents/concept-agent';
import { PipelineContext } from '../types';

export class ConceptStage extends BaseStage {
  name = 'Concept Generation';
  
  constructor(private conceptAgent: ConceptAgent) {
    super();
  }

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.concept) {
      console.log(`🧠 Stage: ${this.name}`);
      return await this.conceptAgent.run(context);
    }
    console.log(`⏭️ Stage ${this.name} уже выполнен, пропускаем`);
    return context;
  }
}