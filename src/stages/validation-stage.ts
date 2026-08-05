// src/stages/validation-stage.ts
import { BaseStage } from './base-stage';
import { ConceptValidator } from '../agents/concept-validator';
import { PipelineContext } from '../types';

export class ValidationStage extends BaseStage {
  name = 'Concept Validation';
  
  constructor(private conceptValidator: ConceptValidator) {
    super();
  }

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.validation) {
      console.log(`🔍 Stage: ${this.name}`);
      return await this.conceptValidator.run(context);
    }
    console.log(`⏭️ Stage ${this.name} уже выполнен, пропускаем`);
    return context;
  }
}