// src/stages/market-stage.ts
import { BaseStage } from './base-stage';
import { MarketAnalyst } from '../agents/market-analyst';
import { PipelineContext } from '../types';

export class MarketStage extends BaseStage {
  name = 'Market Analysis';
  
  constructor(private marketAnalyst: MarketAnalyst) {
    super();
  }

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.market) {
      console.log(`📊 Stage: ${this.name}`);
      return await this.marketAnalyst.run(context);
    }
    console.log(`⏭️ Stage ${this.name} уже выполнен, пропускаем`);
    return context;
  }
}