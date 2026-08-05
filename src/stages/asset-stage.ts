// src/stages/asset-stage.ts
import { BaseStage } from './base-stage';
import { AssetAgent } from '../agents/asset-agent';
import { PipelineContext } from '../types';

/**
 * Подключается после ProductionStage и до CodeStage: превращает счётные
 * оценки продакшна (context.production.art/.audio) в конкретный манифест
 * ассетов (пути/типы/промпты), который CodeStage затем обязан использовать
 * как единственный источник истины для this.load.*(...) в коде.
 */
export class AssetStage extends BaseStage {
  name = 'Asset Manifest';

  constructor(private assetAgent: AssetAgent) {
    super();
  }

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.assets) {
      console.log(`🎨 Stage: ${this.name}`);
      return await this.assetAgent.run(context);
    }
    console.log(`⏭️ Stage ${this.name} уже выполнен, пропускаем`);
    return context;
  }
}
