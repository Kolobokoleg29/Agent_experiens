// src/stages/review-stage.ts
import { BaseStage } from './base-stage';
import { ReviewAgent } from '../agents/review-agent';
import { PipelineContext } from '../types';

export class ReviewStage extends BaseStage {
  name = 'Code Review';
  
  constructor(private reviewAgent: ReviewAgent) {
    super();
  }

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.review) {
      console.log(`🔍 Stage: ${this.name}`);
      return await this.reviewAgent.run(context);
    }
    console.log(`⏭️ Stage ${this.name} уже выполнен, пропускаем`);
    return context;
  }
}