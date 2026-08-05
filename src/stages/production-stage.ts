// src/stages/production-stage.ts
import { BaseStage } from './base-stage';
import { ProductionAgent } from '../agents/production-agent';
import { PipelineContext } from '../types';

export class ProductionStage extends BaseStage {
  name = 'Production Estimation';

  constructor(private productionAgent: ProductionAgent) {
    super();
  }

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.production) {
      console.log(`🏗️ Stage: ${this.name}`);
      return await this.productionAgent.run(context);
    }
    console.log(`⏭️ Stage ${this.name} уже выполнен, пропускаем`);
    return context;
  }
}
