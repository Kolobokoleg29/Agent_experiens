// src/agents/supervisor-agent.ts
import { BaseAgent } from './base-agent';
import { PipelineContext, GameConcept, GameDesignDocument, GameCode, ValidationResult } from '../types';
import * as fs from 'fs/promises';

export interface SupervisorReport {
  stage: string;
  passed: boolean;
  issues: string[];
  suggestions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  requiresHumanReview: boolean;
  metrics?: {
    qualityScore?: number;
    tokenUsage?: number;
  };
}

export class SupervisorAgent extends BaseAgent {
  private logFile: string = 'supervisor.log';

  async run(context: PipelineContext): Promise<PipelineContext> {
    console.log('🔍 Supervisor: Проверка состояния...');

    try {
      let report: SupervisorReport | null = null;

      // Определяем, какой этап сейчас проверять, по наличию данных в контексте
      if (context.concept && context.validation && !context.gdd) {
        // Этап концепции
        report = await this.inspectConcept(context.concept, context.validation);
        context.metrics.supervisorConcept = report;
        this.updateContext(context, `Supervisor: Concept ${report.passed ? 'PASS' : 'FAIL'}`);
      } else if (context.gdd && !context.code) {
        // Этап GDD
        report = await this.inspectDesign(context.gdd);
        context.metrics.supervisorDesign = report;
        this.updateContext(context, `Supervisor: Design ${report.passed ? 'PASS' : 'FAIL'}`);
      } else if (context.code && !context.review) {
        // Этап кода (перед ревью)
        report = await this.inspectCode(context.code);
        context.metrics.supervisorCode = report;
        this.updateContext(context, `Supervisor: Code ${report.passed ? 'PASS' : 'FAIL'}`);
      } else {
        // Если ничего не подошло – просто логируем
        console.log('ℹ️ Supervisor: Нет данных для проверки. Пропускаем.');
        return context;
      }

      // Логируем результат
      await this.log(`Supervisor report: ${report.stage} - ${report.passed ? 'PASS' : 'FAIL'}`);
      await this.log(`  Issues: ${report.issues.join(', ')}`);

      // Если проверка не пройдена, добавляем ошибку в контекст
      if (!report.passed) {
        context.errors.push(`Supervisor: ${report.stage} - ${report.issues.join('; ')}`);
        // Если требуется ручное вмешательство – добавляем предупреждение
        if (report.requiresHumanReview) {
          context.warnings.push(`Supervisor: Требуется ручная проверка на этапе ${report.stage}`);
        }
      }

      console.log(`📊 Supervisor (${report.stage}): ${report.passed ? '✅ одобрено' : '❌ отклонено'}`);
      if (!report.passed) {
        console.log(`   Причины: ${report.issues.join(', ')}`);
      }
      if (report.suggestions.length > 0) {
        console.log(`   Рекомендации: ${report.suggestions.join('; ')}`);
      }

      return context;
    } catch (error) {
      console.error('❌ Ошибка в Supervisor:', error);
      context.errors.push(`Supervisor: ${error}`);
      throw error;
    }
  }

  // === МЕТОДЫ ПРОВЕРКИ ===

  /**
   * Проверяет концепцию
   */
  async inspectConcept(concept: GameConcept, validation: ValidationResult): Promise<SupervisorReport> {
    console.log('🔍 Supervisor: Проверка концепции...');
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 1. Проверка на запрещённый контент.
    // ВАЖНО: раньше это была голая проверка text.includes('kill') и т.п. —
    // 'kill' является подстрокой обычного слова "skill", поэтому любая
    // концепция про skill-based игру ложно помечалась как запрещённый
    // контент. Теперь используются границы слова (\b) — это всё ещё грубая
    // дополнительная страховка, а не замена moderation_safety (п.5 ниже),
    // который считает LLM-валидатор на основе полного контекста.
    if (this.containsRestrictedContent(concept.description)) {
      issues.push('Концепция содержит потенциально запрещённый контент (насилие, 18+, оскорбления) — требуется проверка человеком');
    }

    // 1.5. Проверка на технологии/фичи, нереализуемые на платформе Яндекс
    // Игр (браузерный iframe + Yandex Games SDK). NicheHunter/ConceptAgent
    // теперь получают эти ограничения в промпте, но LLM может их
    // проигнорировать — это дешёвая страховочная сетка постфактум.
    const conceptText = [concept.description, concept.core_mechanic, concept.unique_selling_point, concept.nicheFit]
      .filter(Boolean)
      .join(' ');
    const platformIssue = this.findPlatformIncompatibility(conceptText);
    if (platformIssue) {
      issues.push(`Концепция упоминает нереализуемую на платформе технологию: "${platformIssue}" — Яндекс Игры это браузерный iframe без нативных SDK/доступа к устройствам`);
      suggestions.push('Замените механику на реализуемую средствами Yandex Games SDK и Phaser 3 в браузере');
    }

    // 2. Проверка реализуемости
    if (validation.scores.feasibility < 5) {
      issues.push(`Реализуемость слишком низкая (${validation.scores.feasibility}/10)`);
      suggestions.push('Упростите механику или уменьшите масштаб MVP');
    }

    // 3. Проверка уникальности
    if (validation.scores.uniqueness < 4) {
      issues.push(`Уникальность слишком низкая (${validation.scores.uniqueness}/10)`);
      suggestions.push('Добавьте уникальную механику или нестандартный сеттинг');
    }

    // 4. Проверка монетизации
    if (validation.scores.monetization_potential < 5) {
      issues.push(`Монетизационный потенциал низкий (${validation.scores.monetization_potential}/10)`);
      suggestions.push('Рассмотрите гибридную монетизацию (реклама + IAP)');
    }

    // 5. Проверка модерационной безопасности
    if (validation.scores.moderation_safety < 7) {
      issues.push(`Риск модерации высок (${validation.scores.moderation_safety}/10)`);
      suggestions.push('Уберите спорные элементы, проверьте соответствие правилам Яндекс.Игр');
    }

    // 6. Проверка соответствия исходной нише — концепция могла полностью
    // уйти от выбранной ниши, и раньше это никто на уровне пайплайна не
    // проверял (только человек мог заметить постфактум).
    if (validation.scores.niche_adherence !== undefined && validation.scores.niche_adherence < 6) {
      issues.push(`Концепция слабо соответствует исходной нише (niche_adherence=${validation.scores.niche_adherence}/10) — возможен дрейф от выбранной ниши`);
      suggestions.push('Проверьте nicheFit концепции и, при необходимости, отправьте на перегенерацию с явным требованием сохранить механику ниши');
    }

    const passed = issues.length < 3;
    // Нереализуемая технология — не "ещё одна проблема из трёх", а
    // однозначный блокер (концепцию физически нельзя построить), поэтому
    // форсируем high риск независимо от общего количества issues.
    const riskLevel = platformIssue ? 'high' : this.calculateRiskLevel(issues);

    return {
      stage: 'concept',
      passed: passed && !platformIssue,
      issues,
      suggestions,
      riskLevel,
      requiresHumanReview: riskLevel === 'high' || !passed,
      metrics: {
        qualityScore: this.calculateQualityScore(validation.scores),
      },
    };
  }

  /**
   * Проверяет GDD
   */
  async inspectDesign(gdd: GameDesignDocument): Promise<SupervisorReport> {
    console.log('🔍 Supervisor: Проверка GDD...');
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Проверка наличия всех обязательных разделов
    const requiredSections = ['concept', 'uniqueness', 'targetAudience', 'coreLoop', 'monetization', 'technicalArchitecture', 'mvpFeatures'];
    for (const section of requiredSections) {
      if (!gdd[section as keyof GameDesignDocument]) {
        issues.push(`Отсутствует обязательный раздел: ${section}`);
      }
    }

    // Проверка MVP-фич (не более 5-7 для 1-2 недель)
    if (gdd.mvpFeatures && gdd.mvpFeatures.length > 7) {
      issues.push(`Слишком много MVP-фич (${gdd.mvpFeatures.length}), рекомендуется не более 5-7`);
      suggestions.push('Сократите MVP до ядра, остальное — в пост-релиз');
    }

    // Проверка технической архитектуры (Phaser 3, 2D)
    if (gdd.technicalArchitecture && !gdd.technicalArchitecture.physics?.includes('Arcade')) {
      suggestions.push('Рекомендуется использовать Phaser Arcade Physics для 2D-игр');
    }

    // Проверка на нереализуемые на платформе технологии — GameArchitect
    // теперь получает список ограничений в промпте, но это страховка на
    // случай, если модель их не учла (например, в свободных полях
    // uniqueness/coreLoop/moderationRequirements/mvpFeatures).
    const gddText = [
      gdd.uniqueness,
      gdd.coreLoop?.perSecond,
      gdd.coreLoop?.perMinute,
      gdd.coreLoop?.perSession,
      gdd.coreLoop?.progression,
      gdd.technicalArchitecture?.saveSystem,
      ...(gdd.mvpFeatures || []),
      ...(gdd.moderationRequirements || []),
      ...((gdd.technicalArchitecture?.entities as any[])?.map((e) => JSON.stringify(e)) || []),
    ]
      .filter(Boolean)
      .join(' ');
    const platformIssue = this.findPlatformIncompatibility(gddText);
    if (platformIssue) {
      issues.push(`GDD упоминает нереализуемую на платформе технологию: "${platformIssue}" — Яндекс Игры это браузерный iframe без нативных SDK/доступа к устройствам`);
      suggestions.push('Замените фичу на реализуемую средствами Yandex Games SDK и Phaser 3 в браузере');
    }

    const passed = issues.length < 3;
    const riskLevel = platformIssue ? 'high' : this.calculateRiskLevel(issues);
    return {
      stage: 'design',
      passed: passed && !platformIssue,
      issues,
      suggestions,
      riskLevel,
      requiresHumanReview: issues.length > 0,
    };
  }

  /**
   * Проверяет сгенерированный код
   */
  async inspectCode(code: GameCode): Promise<SupervisorReport> {
    console.log('🔍 Supervisor: Проверка кода...');
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 1. Проверка наличия обязательных файлов
    const requiredFiles = ['BootScene.ts', 'GameScene.ts', 'MenuScene.ts'];
    for (const file of requiredFiles) {
      if (!code.files.some(f => f.path.includes(file))) {
        issues.push(`Отсутствует обязательный файл: ${file}`);
        suggestions.push(`Добавьте ${file} для корректной работы`);
      }
    }

    // 2. Проверка на утечки памяти (таймеры, события)
    const codeContent = JSON.stringify(code.files);
    if (codeContent.includes('setInterval') && !codeContent.includes('clearInterval')) {
      issues.push('Обнаружены setInterval без clearInterval — возможны утечки памяти');
      suggestions.push('Всегда очищайте таймеры в методе shutdown() сцены');
    }

    // 3. Проверка на импорт Phaser
    if (!codeContent.includes('import Phaser')) {
      issues.push('Отсутствует импорт Phaser — игра не запустится');
    }

    // 4. Проверка на использование Yandex SDK (обязательно для модерации)
    if (!codeContent.includes('ysdk')) {
      issues.push('Не найден импорт Yandex SDK — игра не пройдёт модерацию');
      suggestions.push('Добавьте интеграцию с Yandex SDK для монетизации и модерации');
    }

    const passed = issues.length < 3;
    return {
      stage: 'code',
      passed,
      issues,
      suggestions,
      riskLevel: this.calculateRiskLevel(issues),
      requiresHumanReview: issues.length > 2,
    };
  }

  // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

  private containsRestrictedContent(text: string): boolean {
    // Границы слова (\b), а не includes() — иначе 'kill' ложно срабатывает
    // на 'skill'/'skilled', 'sex' — на 'essex'/'sextet' и т.д. Это всё ещё
    // грубая эвристика (сигнал "проверить человеку", не финальный вердикт),
    // основной источник истины — validation.scores.moderation_safety.
    const restrictedWords = ['kill', 'blood', 'gore', 'sex', 'nude', 'violence', 'drugs'];
    const lower = text.toLowerCase();
    return restrictedWords.some(word => new RegExp(`\\b${word}\\b`, 'i').test(lower));
  }

  /**
   * Дешёвая страховочная сетка постфактум: Niche/Concept/GDD-промпты теперь
   * явно запрещают эти технологии (см. niche-hunter.ts/game-architect.ts),
   * но модель может проигнорировать инструкцию. Здесь — детерминированный
   * поиск по подстрокам/regex без доп. LLM-вызова. Возвращает найденное
   * совпадение (для сообщения) или null, если всё чисто.
   */
  private findPlatformIncompatibility(text: string): string | null {
    if (!text) return null;
    const lower = text.toLowerCase();
    // ВАЖНО: \b в JS-регулярках определяется через ASCII \w и НЕ распознаёт
    // границы слов на кириллице (тот же класс бага, что был в
    // containsRestrictedContent, только там слова латиницей и \b работал
    // случайно правильно). Для кириллических паттернов используем явные
    // lookaround на \p{L}\p{N} с флагом u вместо \b.
    const patterns: Array<[RegExp, string]> = [
      [/webrtc/i, 'WebRTC'],
      [/voice\s*chat/i, 'voice chat'],
      [/discord/i, 'интеграция с Discord'],
      [/telegram[- ]?(бот|интеграц)/i, 'интеграция с Telegram'],
      [/\bussd\b/i, 'USSD-платежи'],
      [/(?<![\p{L}\p{N}])голосов(ой|ые|ого|ых)?\s*(чат|линии)(?![\p{L}\p{N}])/iu, 'голосовой чат'],
      [/(?<![\p{L}\p{N}])микрофон/iu, 'доступ к микрофону'],
      [/(?<![\p{L}\p{N}])камер[аеы](?![\p{L}\p{N}])/iu, 'доступ к камере'],
      [/(?<![\p{L}\p{N}])крипт[оа]/iu, 'крипто-платежи'],
      [/push[- ]?уведомлен/iu, 'push-уведомления'],
      [/нативн(ое|ый|ого)\s*(приложение|клиент)/iu, 'нативное приложение'],
    ];
    for (const [regex, label] of patterns) {
      if (regex.test(lower)) return label;
    }
    return null;
  }

  private calculateRiskLevel(issues: string[]): 'low' | 'medium' | 'high' {
    if (issues.length === 0) return 'low';
    if (issues.length < 3) return 'medium';
    return 'high';
  }

  private calculateQualityScore(scores: any): number {
    const values = Object.values(scores).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  private async log(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    await fs.appendFile(this.logFile, `[${timestamp}] ${message}\n`).catch(() => {});
  }
}