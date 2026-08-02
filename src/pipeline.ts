// src/pipeline.ts
import { MarketAnalyst } from './agents/market-analyst';
import { NicheHunter } from './agents/niche-hunter';
import { ConceptValidator } from './agents/concept-validator';
import { GameArchitect } from './agents/game-architect';
import { ConceptAgent } from './agents/concept-agent';
import { CodeAgent } from './agents/code-agent';
import { ReviewAgent } from './agents/review-agent';
import { SupervisorAgent, SupervisorReport } from './agents/supervisor-agent';
import { OpenRouterClient } from './core/openrouter-client';
import { TavilyClient } from './core/tavily-client';
import { 
  AgentContext, 
  GameCode, 
  ReviewResult, 
  GameConcept, 
  GameDesignDocument, 
  MarketData, 
  NicheIdea, 
  ValidationResult 
} from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class Pipeline {
  private marketAnalyst: MarketAnalyst;
  private nicheHunter: NicheHunter;
  private conceptValidator: ConceptValidator;
  private gameArchitect: GameArchitect;
  private conceptAgent: ConceptAgent;
  private codeAgent: CodeAgent;
  private reviewAgent: ReviewAgent;
  private supervisor: SupervisorAgent;
  private maxNicheRounds: number;

  constructor(
    openRouter: OpenRouterClient,
    tavily?: TavilyClient,
    maxNicheRounds = 3
  ) {
    this.marketAnalyst = new MarketAnalyst(openRouter, tavily);
    this.nicheHunter = new NicheHunter(openRouter, tavily);
    this.conceptValidator = new ConceptValidator(openRouter, tavily);
    this.gameArchitect = new GameArchitect(openRouter, tavily);
    this.conceptAgent = new ConceptAgent(openRouter, tavily);
    this.codeAgent = new CodeAgent(openRouter, tavily);
    this.reviewAgent = new ReviewAgent(openRouter, tavily);
    this.supervisor = new SupervisorAgent(openRouter, tavily);
    this.maxNicheRounds = maxNicheRounds;
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

  private buildFeedbackPrompt(validation: ValidationResult): string {
    const parts: string[] = [];
    if (validation.improvements && validation.improvements.length > 0) {
      parts.push(`Улучшения:\n${validation.improvements.map((imp, i) => `${i+1}. ${imp}`).join('\n')}`);
    }
    if (validation.risks && validation.risks.length > 0) {
      parts.push(`Риски, которые нужно учесть:\n${validation.risks.map((risk, i) => `${i+1}. ${risk}`).join('\n')}`);
    }
    if (validation.alternatives && validation.alternatives.length > 0) {
      parts.push(`Альтернативные механики для рассмотрения:\n${validation.alternatives.map((alt, i) => `${i+1}. ${alt}`).join('\n')}`);
    }
    return parts.join('\n\n');
  }

  // === ОСНОВНОЙ МЕТОД С ПОЛНЫМ КОНТРОЛЕМ ===
  async runFullResearch(): Promise<any> {
    console.log('🚀 ЗАПУСК ПОЛНОГО АНАЛИТИЧЕСКОГО ПАЙПЛАЙНА (с Supervisor и ротацией ниш)');

    // 1. Анализ рынка (загружаем или генерируем)
    let marketData: MarketData;
    const marketFile = path.join(process.cwd(), 'output', '1-market-data.json');
    if (await this.fileExists(marketFile)) {
      console.log('📂 Загружаем сохранённый анализ рынка из файла');
      marketData = JSON.parse(await fs.readFile(marketFile, 'utf-8'));
    } else {
      console.log('📊 Сбор данных о платформе Яндекс Игры...');
      marketData = await this.marketAnalyst.run();
      await this.saveIntermediate('1-market-data.json', marketData);
    }

    let nicheRound = 0;
    let finalResult: any = null;
    let allNichesExhausted = false;

    while (!allNichesExhausted && nicheRound < this.maxNicheRounds) {
      nicheRound++;
      console.log(`\n🌍 РАУНД НИШ #${nicheRound}`);

      // 2. Получаем ниши (либо загружаем, либо генерируем новые)
      let niches: NicheIdea[];
      const nichesFile = path.join(process.cwd(), 'output', `2-niches-round-${nicheRound}.json`);
      if (await this.fileExists(nichesFile)) {
        console.log(`📂 Загружаем ниши из файла (раунд ${nicheRound})`);
        niches = JSON.parse(await fs.readFile(nichesFile, 'utf-8'));
      } else {
        console.log(`🎯 Генерируем новый набор ниш (раунд ${nicheRound})...`);
        niches = await this.nicheHunter.findNiches(marketData);
        await this.saveIntermediate(`2-niches-round-${nicheRound}.json`, niches);
      }

      if (!niches || niches.length === 0) {
        console.warn('⚠️ Ниши не найдены. Пропускаем раунд.');
        continue;
      }

      // 3. Перебираем ниши по очереди
      for (let ni = 0; ni < niches.length; ni++) {
        const niche = niches[ni];
        console.log(`\n🎯 ИССЛЕДУЕМ НИШУ #${ni+1}/${niches.length}: "${niche.name}"`);

        let concept: GameConcept | null = null;
        let validation: ValidationResult | null = null;
        let attempt = 1;
        const maxAttempts = 3;
        let conceptAccepted = false;

        while (attempt <= maxAttempts) {
          console.log(`\n🔄 Попытка ${attempt}/${maxAttempts} для ниши "${niche.name}"`);

          // Генерация концепции (с учётом замечаний)
          if (attempt === 1) {
            concept = await this.conceptAgent.run({
              userPrompt: niche.description,
              searchEnabled: true,
            });
          } else {
            const feedback = validation ? this.buildFeedbackPrompt(validation) : '';
            const improvedPrompt = `${niche.description}\n\nУчти следующие замечания и улучшения:\n${feedback}`;
            concept = await this.conceptAgent.run({
              userPrompt: improvedPrompt,
              searchEnabled: true,
            });
          }

          await this.saveIntermediate(`3-concept-niche-${ni+1}-attempt-${attempt}.json`, concept);

          // Валидация
          console.log('🔍 Валидация концепции...');
          validation = await this.conceptValidator.validate(concept);
          await this.saveIntermediate(`4-validation-niche-${ni+1}-attempt-${attempt}.json`, validation);

          // === SUPERVISOR проверяет концепцию ===
          const supervisorReport = await this.supervisor.inspectConcept(concept, validation);
          await this.supervisor.log(`Concept check (niche ${ni+1}, attempt ${attempt}): ${supervisorReport.passed ? 'PASS' : 'FAIL'}`);
          await this.saveIntermediate(`supervisor-concept-niche-${ni+1}-attempt-${attempt}.json`, supervisorReport);

          console.log(`📊 Результаты валидации (ниша #${ni+1}, попытка ${attempt}):`);
          console.log(`  Вердикт: ${validation.verdict}`);
          console.log(`  Оценки: ${JSON.stringify(validation.scores, null, 2)}`);
          console.log(`  Supervisor: ${supervisorReport.passed ? '✅ одобрено' : '❌ отклонено'}`);
          if (!supervisorReport.passed) {
            console.log(`  Причины: ${supervisorReport.issues.join(', ')}`);
          }

          // Если Supervisor одобрил И концепция approved — принимаем
          if (supervisorReport.passed && validation.verdict === 'approved') {
            console.log(`✅ Концепция для ниши "${niche.name}" ПРИНЯТА!`);
            conceptAccepted = true;
            break;
          } else if (attempt === maxAttempts) {
            console.log(`❌ Концепция для ниши "${niche.name}" не прошла проверку после ${maxAttempts} попыток.`);
          } else {
            console.log(`⚠️ Концепция требует доработки. Пробуем улучшить...`);
            attempt++;
          }
        }

        // Если концепция принята — переходим к GDD и коду с проверкой Supervisor
        if (conceptAccepted && concept && validation) {
          console.log(`\n✅ ПЕРЕХОД К ГЕНЕРАЦИИ GDD И КОДА ДЛЯ НИШИ "${niche.name}"`);

          // Генерация GDD
          console.log('📐 Создание Game Design Document...');
          const gdd = await this.gameArchitect.design(concept);
          await this.saveIntermediate('5-gdd.json', gdd);

          // Supervisor проверяет GDD
          const designReport = await this.supervisor.inspectDesign(gdd);
          await this.supervisor.log(`Design check: ${designReport.passed ? 'PASS' : 'FAIL'}`);
          await this.saveIntermediate('supervisor-design.json', designReport);

          if (!designReport.passed) {
            console.log('❌ Supervisor отклонил GDD:', designReport.issues);
            // Можно попытаться перегенерировать GDD с учётом замечаний, но для простоты прерываем
            console.log('⚠️ Рекомендуется доработать GDD вручную или перезапустить пайплайн.');
            return { concept, gdd, designReport };
          }

          // Генерация кода
          console.log('💻 Генерация кода...');
          const code = await this.codeAgent.run({ design: gdd });
          await this.saveIntermediate('6-code.json', code);

          // Supervisor проверяет код
          const codeReport = await this.supervisor.inspectCode(code);
          await this.supervisor.log(`Code check: ${codeReport.passed ? 'PASS' : 'FAIL'}`);
          await this.saveIntermediate('supervisor-code.json', codeReport);

          if (!codeReport.passed) {
            console.log('❌ Supervisor отклонил код:', codeReport.issues);
            // Пытаемся автофиксить через ReviewAgent
            console.log('🔄 Запускаем автофикс через ReviewAgent...');
            const reviewResult = await this.reviewAgent.run({ code });
            if (reviewResult.passed) {
              console.log('✅ Автофикс успешен, код исправлен');
              // Сохраняем исправленный код
              await this.saveIntermediate('6-code-fixed.json', reviewResult.fixes);
            } else {
              console.log('❌ Автофикс не помог, требуется ручное вмешательство');
              return { concept, gdd, code, codeReport };
            }
          }

          // Ревью (финальная проверка)
          console.log('🔍 Финальное ревью кода...');
          const review = await this.reviewAgent.run({ code });
          await this.saveIntermediate('7-review.json', review);

          console.log('🎉 Пайплайн УСПЕШНО ЗАВЕРШЁН!');
          finalResult = { concept, gdd, code, review, niche, validation };
          allNichesExhausted = true;
          break;
        } else {
          console.log(`⚠️ Ниша "${niche.name}" не прошла валидацию. Переходим к следующей нише...`);
        }
      }

      // Если после перебора всех ниш в этом раунде не нашли подходящую — генерируем новый набор ниш (следующий раунд)
      if (!finalResult && nicheRound < this.maxNicheRounds) {
        console.log(`\n🔄 Все ниши в раунде #${nicheRound} не прошли проверку. Генерируем новый набор ниш...`);
        try {
          await fs.unlink(path.join(process.cwd(), 'output', `2-niches-round-${nicheRound}.json`));
        } catch {}
      } else if (!finalResult && nicheRound >= this.maxNicheRounds) {
        console.log(`\n❌ Все ${this.maxNicheRounds} раундов ниш исчерпаны. Подходящая концепция не найдена.`);
        console.log('💡 Рекомендации:');
        console.log('  1. Проверьте качество рыночных данных (output/1-market-data.json)');
        console.log('  2. Измените промпты для генерации ниш (src/agents/niche-hunter.ts)');
        console.log('  3. Увеличьте maxNicheRounds в конструкторе Pipeline');
        allNichesExhausted = true;
      }
    }

    if (!finalResult) {
      console.log('\n❌ Пайплайн завершился без одобренной концепции.');
    }

    return finalResult;
  }

  // === РЕЖИМ 2: АНАЛИЗ КОНКРЕТНОЙ ИГРЫ ===
  async analyzeGame(gameUrlOrName: string): Promise<any> {
    console.log(`🔍 Анализ игры: ${gameUrlOrName}`);
    return { gameUrlOrName, message: 'Анализ в разработке' };
  }

  // === РЕЖИМ 3: БЫСТРАЯ ГЕНЕРАЦИЯ ===
  async run(userPrompt: string, searchEnabled: boolean = true): Promise<GameCode> {
    console.log(`🚀 Быстрая генерация игры по описанию: "${userPrompt}"`);
    const context: AgentContext = { userPrompt, searchEnabled };

    const concept = await this.conceptAgent.run(context);
    await this.saveIntermediate('concept.json', concept);

    const design = await this.gameArchitect.design(concept);
    await this.saveIntermediate('design.json', design);

    const code = await this.codeAgent.run({ design });
    await this.saveIntermediate('code.json', code);

    const review = await this.reviewAgent.run({ code });
    await this.saveIntermediate('review.json', review);

    if (!review.passed) {
      console.warn('⚠️ Код содержит ошибки после ревью, но результат сохранён.');
    }

    return code;
  }
}