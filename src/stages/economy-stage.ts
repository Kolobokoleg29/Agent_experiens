// src/stages/economy-stage.ts
import { BaseStage } from './base-stage';
import { EconomyAgent } from '../agents/economy-agent';
import { PipelineContext } from '../types';

export class EconomyStage extends BaseStage {
  name = 'Economy Calculation';

  constructor(private economyAgent: EconomyAgent) {
    super();
  }

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.economy) {
      console.log(`💰 Stage: ${this.name}`);
      return await this.economyAgent.run(context);
    }
    console.log(`⏭️ Stage ${this.name} уже выполнен, пропускаем`);
    return context;
  }
}
