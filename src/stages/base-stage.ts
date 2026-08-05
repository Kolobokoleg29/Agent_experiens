// src/stages/base-stage.ts
import { PipelineContext } from '../types';

export abstract class BaseStage {
  abstract name: string;
  abstract execute(context: PipelineContext): Promise<PipelineContext>;
}