// src/stages/design-stage.ts
import { BaseStage } from './base-stage';
import { GameArchitect } from '../agents/game-architect';
import { PipelineContext } from '../types';

export class DesignStage extends BaseStage {
  name = 'GDD Generation';
  
  constructor(private gameArchitect: GameArchitect) {
    super();
  }

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.gdd) {
      console.log(`📐 Stage: ${this.name}`);
      return await this.gameArchitect.run(context);
    }
    console.log(`⏭️ Stage ${this.name} уже выполнен, пропускаем`);
    return context;
  }
}