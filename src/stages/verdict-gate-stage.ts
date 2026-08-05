// src/stages/verdict-gate-stage.ts
import { BaseStage } from './base-stage';
import { ConceptAgent } from '../agents/concept-agent';
import { ConceptValidator } from '../agents/concept-validator';
import { PipelineContext } from '../types';

const MAX_CONCEPT_RETRIES = 3;

/**
 * Раньше ValidationResult.verdict ни на что не влиял: ApprovalStage всегда
 * показывал концепцию человеку на подтверждение, независимо от того, был
 * вердикт "approved", "needs_work" или "rejected" (см. аудит, P1-5).
 *
 * Эта стадия встаёт между ValidationStage и ApprovalStage:
 *  - Если verdict === 'approved' — просто пропускает дальше, ничего не делая.
 *  - Если verdict === 'rejected' или 'needs_work' — автоматически
 *    перегенерирует концепцию (ConceptAgent, который теперь учитывает
 *    risks/improvements/alternatives из прошлой валидации) и валидирует её
 *    заново, до MAX_CONCEPT_RETRIES попыток, увеличивая context.retryCount.
 *  - Человек НЕ видит промежуточные отклонённые версии — только либо
 *    финально одобренную концепцию, либо, если лимит попыток исчерпан,
 *    последнюю (не полностью одобренную) версию — на этом этапе решение
 *    отдаётся человеку через существующий ApprovalStage (принять с
 *    оговорками или отклонить и доработать вручную).
 */
export class VerdictGateStage extends BaseStage {
  name = 'Verdict Gate';

  constructor(
    private conceptAgent: ConceptAgent,
    private conceptValidator: ConceptValidator,
    private maxRetries: number = MAX_CONCEPT_RETRIES
  ) {
    super();
  }

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.validation) {
      // Валидация ещё не выполнялась — нечего проверять, пропускаем.
      return context;
    }

    if (context.validation.verdict === 'approved') {
      console.log(`✅ Stage ${this.name}: вердикт "approved", ретрай не требуется`);
      return context;
    }

    console.log(`🔁 Stage: ${this.name} — вердикт "${context.validation.verdict}", запускаем автоматическую перегенерацию концепции`);

    while (
      context.validation &&
      context.validation.verdict !== 'approved' &&
      context.retryCount < this.maxRetries
    ) {
      context.retryCount++;
      console.log(`   Попытка перегенерации ${context.retryCount}/${this.maxRetries}...`);

      context = await this.conceptAgent.run(context);
      context = await this.conceptValidator.run(context);

      console.log(`   Новый вердикт: ${context.validation?.verdict}`);
    }

    if (context.validation?.verdict !== 'approved') {
      console.warn(
        `⚠️ После ${context.retryCount} попыток концепция всё ещё не "approved" ` +
        `(текущий вердикт: ${context.validation?.verdict}). Эскалация к человеку через ApprovalStage.`
      );
    }

    return context;
  }
}
