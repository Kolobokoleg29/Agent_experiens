// src/stages/code-stage.ts
import { BaseStage } from './base-stage';
import { CodeAgent } from '../agents/code-agent';
import { PipelineContext } from '../types';

export class CodeStage extends BaseStage {
  name = 'Code Generation';
  
  constructor(private codeAgent: CodeAgent) {
    super();
  }

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.code) {
      console.log(`💻 Stage: ${this.name}`);
      return await this.codeAgent.run(context);
    }
    console.log(`⏭️ Stage ${this.name} уже выполнен, пропускаем`);
    return context;
  }
}