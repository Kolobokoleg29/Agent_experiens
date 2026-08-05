// src/stages/supervisor-stage.ts
import { BaseStage } from './base-stage';
import { SupervisorAgent, SupervisorReport } from '../agents/supervisor-agent';
import { PipelineContext } from '../types';

/**
 * SupervisorAgent был написан (agents/supervisor-agent.ts, умеет проверять
 * concept/GDD/code), но нигде не подключался к pipeline.ts — создавался
 * (`new SupervisorAgent(...)`) и после этого ни разу не вызывался. Эта
 * stage — тонкая обёртка, которая подключает его к трём контрольным точкам
 * пайплайна: после валидации концепции, после генерации GDD (до
 * Economy/Production) и после генерации кода.
 *
 * SupervisorAgent.run() сам определяет, какую проверку делать, по составу
 * context (concept+validation+!gdd -> inspectConcept, gdd+!code ->
 * inspectDesign, code+!review -> inspectCode). ВАЖНО: условие `gdd && !code`
 * остаётся истинным и во время EconomyStage/ProductionStage (они не пишут
 * context.code) — поэтому SupervisorStage для проверки GDD вставлена сразу
 * после DesignStage, а не после Economy/Production, чтобы не гонять одну и
 * ту же проверку дважды. Проверку economy/production supervisor пока не
 * делает (см. известное ограничение) — это отдельная задача, а не то, что
 * покрывает эта правка.
 *
 * Политика: riskLevel === 'high' (например, потенциально запрещённый
 * контент, либо 3+ несвязанных проблемы сразу) — жёсткий стоп пайплайна.
 * medium/low — только предупреждение (уже записано в context.warnings
 * самим SupervisorAgent), пайплайн продолжается.
 */
export class SupervisorStage extends BaseStage {
  name: string;

  constructor(
    private supervisor: SupervisorAgent,
    private metricsKey: 'supervisorConcept' | 'supervisorDesign' | 'supervisorCode',
    label: string
  ) {
    super();
    this.name = `Supervisor: ${label}`;
  }

  async execute(context: PipelineContext): Promise<PipelineContext> {
    console.log(`🛡️ Stage: ${this.name}`);
    context = await this.supervisor.run(context);

    const report: SupervisorReport | undefined = context.metrics?.[this.metricsKey];
    if (!report) {
      // SupervisorAgent сам решил, что проверять нечего на этом шаге —
      // не считаем это ошибкой конфигурации, просто идём дальше.
      return context;
    }

    if (report.riskLevel === 'high') {
      const reason = `Supervisor (${report.stage}): высокий риск, пайплайн остановлен. Причины: ${report.issues.join('; ')}`;
      console.error(`🛑 ${reason}`);
      throw new Error(reason);
    }

    return context;
  }
}
