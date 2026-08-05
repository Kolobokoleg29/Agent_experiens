// src/stages/project-writer-stage.ts
import * as path from 'path';
import { BaseStage } from './base-stage';
import { PipelineContext } from '../types';
import { slugify, writeProjectToDisk } from '../tools/project-writer';

/**
 * Детерминированный стейдж (без LLM-вызовов, аналог NicheSelectionStage):
 * материализует context.code.files на диск как реальный Vite-проект вместо
 * того, чтобы код оставался только сериализованным JSON в чекпоинте и
 * output/6-code.json.
 *
 * Запускается ПОСЛЕ ReviewStage — к этому моменту context.code уже содержит
 * либо изначальный код, либо исправленную ReviewAgent'ом версию (см.
 * review-agent.ts: `context.code = review.fixes`).
 */
export class ProjectWriterStage extends BaseStage {
  name = 'Project Writer';

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (context.projectPath) {
      console.log(`⏭️ Stage ${this.name} уже выполнен, пропускаем`);
      return context;
    }

    if (!context.code || context.code.files.length === 0) {
      console.warn(`⚠️ Stage ${this.name}: нет сгенерированного кода, запись на диск пропущена`);
      return context;
    }

    console.log(`💾 Stage: ${this.name}`);

    const title = context.concept?.title || context.gdd?.concept || 'yandex-game';
    const slug = slugify(title);
    const outputRoot = path.join(process.cwd(), 'output', 'games');

    const result = await writeProjectToDisk(context.code, {
      outputRoot,
      slug,
      title,
      assetManifest: context.assets,
    });

    context.projectPath = result.projectDir;
    context.updatedAt = new Date();
    context.history.push(`Project written to disk: ${result.projectDir} (${result.filesWritten.length} files)`);
    context.metrics.projectWriter = {
      filesWritten: result.filesWritten.length,
      skipped: result.skipped.length,
      entryDetected: result.entryFile !== null,
      assetBriefWritten: result.assetBriefWritten,
    };

    if (!context.assets) {
      const msg =
        'ProjectWriterStage: манифест ассетов (context.assets) отсутствует — ASSET_BRIEF.md не создан, пути к ассетам в коде не подтверждены.';
      console.warn(`⚠️ ${msg}`);
      context.warnings.push(msg);
    }

    if (result.skipped.length > 0) {
      const msg = `ProjectWriterStage: пропущено ${result.skipped.length} файлов с небезопасными путями: ${result.skipped
        .map((s) => s.path)
        .join(', ')}`;
      console.warn(`⚠️ ${msg}`);
      context.warnings.push(msg);
    }

    if (!result.entryFile) {
      const msg =
        'ProjectWriterStage: среди сгенерированных файлов не найден явный вызов new Phaser.Game(...) — index.html указывает на entry point по умолчанию, стоит проверить вручную.';
      console.warn(`⚠️ ${msg}`);
      context.warnings.push(msg);
    }

    console.log(`✅ Проект записан на диск: ${result.projectDir} (${result.filesWritten.length} файлов)`);
    return context;
  }
}
