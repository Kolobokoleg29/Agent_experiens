// src/stages/approval-stage.ts
import { BaseStage } from './base-stage';
import { PipelineContext } from '../types';
import readline from 'readline';

export class ApprovalStage extends BaseStage {
  name = 'Human Approval';

  async execute(context: PipelineContext): Promise<PipelineContext> {
    // Если уже одобрено – пропускаем
    if (context.metrics?.conceptApproved) {
      console.log(`⏭️ Stage ${this.name} уже пройден, пропускаем`);
      return context;
    }

    console.log(`\n📄 Stage: ${this.name}`);
    console.log('Концепция сгенерирована и проверена. Проверьте файл: output/4-validation-attempt-*.json');
    console.log('Хотите продолжить генерацию GDD и кода?');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('(y/n): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('⏸️ Генерация отменена. Вы можете доработать концепцию и запустить пайплайн снова.');
      context.metrics.approval = 'rejected';
      throw new Error('Пользователь отклонил концепцию');
    }

    context.metrics.approval = 'approved';
    context.metrics.conceptApproved = true;
    console.log('✅ Концепция одобрена пользователем. Продолжаем...');
    return context;
  }
}