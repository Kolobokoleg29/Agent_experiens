// src/stages/niche-stage.ts
import { BaseStage } from './base-stage';
import { NicheHunter } from '../agents/niche-hunter';
import { PipelineContext } from '../types';

export class NicheStage extends BaseStage {
  name = 'Niche Hunting';
  
  constructor(private nicheHunter: NicheHunter) {
    super();
  }

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.niches) {
      console.log(`🎯 Stage: ${this.name}`);
      return await this.nicheHunter.run(context);
    }
    console.log(`⏭️ Stage ${this.name} уже выполнен, пропускаем`);
    return context;
  }
}