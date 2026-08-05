// src/pipeline.ts
import { OpenRouterClient } from './core/openrouter-client';
import { TavilyClient } from './core/tavily-client';
import { 
  PipelineContext, 
  createPipelineContext, 
  GameCode,
  NicheIdea,
  ValidationResult
} from './types';
import { BaseStage } from './stages/base-stage';
import { MarketStage } from './stages/market-stage';
import { NicheStage } from './stages/niche-stage';
import { NicheSelectionStage } from './stages/niche-selection-stage';
import { ConceptStage } from './stages/concept-stage';
import { ValidationStage } from './stages/validation-stage';
import { VerdictGateStage } from './stages/verdict-gate-stage';
import { DesignStage } from './stages/design-stage';
import { EconomyStage } from './stages/economy-stage';
import { ProductionStage } from './stages/production-stage';
import { AssetStage } from './stages/asset-stage';
import { CodeStage } from './stages/code-stage';
import { ReviewStage } from './stages/review-stage';
import { ProjectWriterStage } from './stages/project-writer-stage';
import { ApprovalStage } from './stages/approval-stage';
import { SupervisorStage } from './stages/supervisor-stage';

import { MarketAnalyst } from './agents/market-analyst';
import { NicheHunter } from './agents/niche-hunter';
import { ConceptAgent } from './agents/concept-agent';
import { ConceptValidator } from './agents/concept-validator';
import { GameArchitect } from './agents/game-architect';
import { EconomyAgent } from './agents/economy-agent';
import { ProductionAgent } from './agents/production-agent';
import { AssetAgent } from './agents/asset-agent';
import { CodeAgent } from './agents/code-agent';
import { ReviewAgent } from './agents/review-agent';
import { SupervisorAgent } from './agents/supervisor-agent';

import * as fs from 'fs/promises';
import * as path from 'path';

export class Pipeline {
  private stages: BaseStage[];
  private context!: PipelineContext;

  constructor(
    private openRouter: OpenRouterClient,
    private tavily?: TavilyClient,
    private enableApproval = true
  ) {
    const marketAnalyst = new MarketAnalyst(openRouter, tavily);
    const nicheHunter = new NicheHunter(openRouter, tavily);
    const conceptAgent = new ConceptAgent(openRouter, tavily);
    const conceptValidator = new ConceptValidator(openRouter, tavily);
    const gameArchitect = new GameArchitect(openRouter, tavily);
    const economyAgent = new EconomyAgent(openRouter, tavily);
    const productionAgent = new ProductionAgent(openRouter, tavily);
    const assetAgent = new AssetAgent(openRouter, tavily);
    const codeAgent = new CodeAgent(openRouter, tavily);
    const reviewAgent = new ReviewAgent(openRouter, tavily);
    const supervisor = new SupervisorAgent(openRouter, tavily);

    // SupervisorAgent раньше создавался, но нигде не вызывался (мёртвый
    // код) — теперь подключён как SupervisorStage в трёх контрольных
    // точках: после того, как концепция финально одобрена/эскалирована
    // (после VerdictGateStage), после генерации GDD (до Economy/Production)
    // и после генерации кода.
    const stages: BaseStage[] = [
      new MarketStage(marketAnalyst),
      new NicheStage(nicheHunter),
      new NicheSelectionStage(),
      new ConceptStage(conceptAgent),
      new ValidationStage(conceptValidator),
      new VerdictGateStage(conceptAgent, conceptValidator),
      new SupervisorStage(supervisor, 'supervisorConcept', 'концепция'),
    ];

    if (this.enableApproval) {
      stages.push(new ApprovalStage());
    }

    stages.push(
      new DesignStage(gameArchitect),
      new SupervisorStage(supervisor, 'supervisorDesign', 'GDD'),
      new EconomyStage(economyAgent),
      new ProductionStage(productionAgent),
      new AssetStage(assetAgent),
      new CodeStage(codeAgent),
      new SupervisorStage(supervisor, 'supervisorCode', 'код'),
      new ReviewStage(reviewAgent),
      new ProjectWriterStage()
    );

    this.stages = stages;
  }

  private async saveIntermediate(filename: string, data: any): Promise<void> {
    const outputDir = path.join(process.cwd(), 'output');
    await fs.mkdir(outputDir, { recursive: true });
    const filePath = path.join(outputDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 Промежуточный результат сохранён: ${filePath}`);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async saveCheckpoint(context: PipelineContext): Promise<void> {
    const checkpointFile = path.join(process.cwd(), 'output', `checkpoint-${context.executionId}.json`);
    await fs.writeFile(checkpointFile, JSON.stringify(context, null, 2), 'utf-8');
    console.log(`💾 Чекпоинт сохранён: ${checkpointFile}`);
  }

  private async loadCheckpoint(executionId: string): Promise<PipelineContext | null> {
    const checkpointFile = path.join(process.cwd(), 'output', `checkpoint-${executionId}.json`);
    if (await this.fileExists(checkpointFile)) {
      const data = await fs.readFile(checkpointFile, 'utf-8');
      const context = JSON.parse(data);
      context.startedAt = new Date(context.startedAt);
      context.updatedAt = new Date(context.updatedAt);
      context.cache = new Map(Object.entries(context.cache || {}));
      return context;
    }
    return null;
  }

  async runFullResearch(userPrompt?: string, executionId?: string): Promise<PipelineContext> {
    let context: PipelineContext | null = null;
    if (executionId) {
      context = await this.loadCheckpoint(executionId);
    }
    if (!context) {
      context = createPipelineContext(userPrompt, true);
      
      const approvedFile = path.join(process.cwd(), 'output', 'approved-concept.json');
      if (await this.fileExists(approvedFile)) {
        console.log('📂 Найдена сохранённая одобренная концепция. Пропускаем анализ и валидацию.');
        const saved = JSON.parse(await fs.readFile(approvedFile, 'utf-8'));
        context.concept = saved.concept;
        context.validation = saved.validation;
        context.selectedNiche = saved.niche;
        context.metrics.conceptApproved = true;
        await this.saveCheckpoint(context);
      }
    } else {
      console.log(`📂 Загружен чекпоинт ${executionId}. Продолжаем с этапа:`, context.history[context.history.length - 1]);
    }

    if (!context.saveState) {
      context.saveState = this.saveCheckpoint.bind(this);
    }

    this.context = context;

    for (const stage of this.stages) {
      this.context = await stage.execute(this.context);
      await this.saveCheckpoint(this.context);
    }

    console.log('🎉 Пайплайн успешно завершён!');
    return this.context;
  }

  async run(userPrompt: string, searchEnabled: boolean = true): Promise<GameCode> {
    console.log(`🚀 Быстрая генерация игры по описанию: "${userPrompt}"`);
    const context = createPipelineContext(userPrompt, searchEnabled);
    context.selectedNiche = { name: 'Быстрый режим', description: userPrompt } as NicheIdea;

    const conceptStage = new ConceptStage(new ConceptAgent(this.openRouter, this.tavily));
    const validationStage = new ValidationStage(new ConceptValidator(this.openRouter, this.tavily));
    const designStage = new DesignStage(new GameArchitect(this.openRouter, this.tavily));
    const economyStage = new EconomyStage(new EconomyAgent(this.openRouter, this.tavily));
    const productionStage = new ProductionStage(new ProductionAgent(this.openRouter, this.tavily));
    const assetStage = new AssetStage(new AssetAgent(this.openRouter, this.tavily));
    const codeStage = new CodeStage(new CodeAgent(this.openRouter, this.tavily));
    const reviewStage = new ReviewStage(new ReviewAgent(this.openRouter, this.tavily));
    const supervisor = new SupervisorAgent(this.openRouter, this.tavily);

    let ctx = context;
    ctx = await conceptStage.execute(ctx);
    ctx = await validationStage.execute(ctx);
    if (ctx.validation?.verdict !== 'approved') {
      // Быстрый режим сознательно не делает Verdict Gate с ретраями (в
      // отличие от runFullResearch()) — иначе он не был бы "быстрым".
      // Единственная страховка здесь — SupervisorStage ниже: она всё равно
      // остановит пайплайн (throw), если riskLevel окажется "high"
      // (например, обнаружена нереализуемая на платформе технология или
      // потенциально запрещённый контент). Просто низкие оценки валидации
      // сами по себе пайплайн не остановят — это осознанный компромисс
      // скорости в этом режиме, а не забытая проверка.
      console.warn('⚠️ Концепция не прошла валидацию, но генерируем код в любом случае (быстрый режим). SupervisorStage ниже всё ещё остановит пайплайн при высоком риске.');
    }
    ctx = await new SupervisorStage(supervisor, 'supervisorConcept', 'концепция').execute(ctx);
    ctx = await designStage.execute(ctx);
    ctx = await new SupervisorStage(supervisor, 'supervisorDesign', 'GDD').execute(ctx);
    ctx = await economyStage.execute(ctx);
    ctx = await productionStage.execute(ctx);
    ctx = await assetStage.execute(ctx);
    ctx = await codeStage.execute(ctx);
    ctx = await new SupervisorStage(supervisor, 'supervisorCode', 'код').execute(ctx);
    ctx = await reviewStage.execute(ctx);
    if (!ctx.review?.passed) {
      console.warn('⚠️ Код содержит ошибки после ревью, но результат сохранён.');
    }
    ctx = await new ProjectWriterStage().execute(ctx);
    if (ctx.projectPath) {
      console.log(`📁 Проект доступен по пути: ${ctx.projectPath}`);
    }
    return ctx.code!;
  }

  async analyzeGame(gameUrlOrName: string): Promise<any> {
    console.log(`🔍 Анализ игры: ${gameUrlOrName}`);
    return { gameUrlOrName, message: 'Анализ в разработке' };
  }
}