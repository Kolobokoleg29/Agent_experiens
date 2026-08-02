// src/agents/supervisor-agent.ts
import { BaseAgent } from './base-agent';
import { GameConcept, GameDesignDocument, GameCode, ReviewResult, ValidationResult } from '../types';
import { cleanJson } from '../tools/json-cleaner';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SupervisorReport {
  stage: string;
  passed: boolean;
  issues: string[];
  suggestions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  requiresHumanReview: boolean;
  metrics?: {
    tokenUsage?: number;
    executionTime?: number;
    qualityScore?: number;
  };
}

export class SupervisorAgent extends BaseAgent {
  private logFile: string = 'supervisor.log';
  private maxIssuesBeforeFail: number = 3;
  
  constructor(openRouter: OpenRouterClient, tavily?: TavilyClient) {
    super(openRouter, tavily);
  }

  /**
   * Проверяет этап концепции
   */
  async inspectConcept(concept: GameConcept, validation: ValidationResult): Promise<SupervisorReport> {
    console.log('🔍 Supervisor: Проверка концепции...');
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 1. Проверка на запрещённый контент
    if (this.containsRestrictedContent(concept.description)) {
      issues.push('Концепция содержит запрещённый контент (насилие, 18+, оскорбления)');
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

    const passed = issues.length < this.maxIssuesBeforeFail;
    const riskLevel = this.calculateRiskLevel(issues);

    return {
      stage: 'concept',
      passed,
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
   * Проверяет GDD (дизайн)
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

    const passed = issues.length < this.maxIssuesBeforeFail;
    return {
      stage: 'design',
      passed,
      issues,
      suggestions,
      riskLevel: this.calculateRiskLevel(issues),
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

    // 1. Проверка на синтаксические ошибки (через tsc)
    try {
      const tscErrors = await this.runTsc(code);
      if (tscErrors.length > 0) {
        issues.push(`Найдено ${tscErrors.length} ошибок TypeScript`);
        suggestions.push('Исправьте синтаксические ошибки перед ревью');
      }
    } catch (error) {
      issues.push('Не удалось запустить проверку TypeScript');
    }

    // 2. Проверка наличия обязательных файлов
    const requiredFiles = ['BootScene.ts', 'GameScene.ts', 'MenuScene.ts'];
    for (const file of requiredFiles) {
      if (!code.files.some(f => f.path.includes(file))) {
        issues.push(`Отсутствует обязательный файл: ${file}`);
        suggestions.push(`Добавьте ${file} для корректной работы`);
      }
    }

    // 3. Проверка на утечки памяти (таймеры, события)
    const codeContent = JSON.stringify(code.files);
    if (codeContent.includes('setInterval') && !codeContent.includes('clearInterval')) {
      issues.push('Обнаружены setInterval без clearInterval — возможны утечки памяти');
      suggestions.push('Всегда очищайте таймеры в методе shutdown() сцены');
    }

    // 4. Проверка на импорт Phaser
    if (!codeContent.includes('import Phaser')) {
      issues.push('Отсутствует импорт Phaser — игра не запустится');
    }

    // 5. Проверка на использование Yandex SDK (обязательно для модерации)
    if (!codeContent.includes('ysdk')) {
      issues.push('Не найден импорт Yandex SDK — игра не пройдёт модерацию');
      suggestions.push('Добавьте интеграцию с Yandex SDK для монетизации и модерации');
    }

    const passed = issues.length < this.maxIssuesBeforeFail;
    return {
      stage: 'code',
      passed,
      issues,
      suggestions,
      riskLevel: this.calculateRiskLevel(issues),
      requiresHumanReview: issues.length > 2,
    };
  }

  /**
   * Проверяет ассеты (изображения, звуки)
   */
  async inspectAssets(assets: string[]): Promise<SupervisorReport> {
    console.log('🔍 Supervisor: Проверка ассетов...');
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Проверка форматов
    for (const asset of assets) {
      if (asset.endsWith('.png') || asset.endsWith('.jpg')) {
        // Проверим размеры, если файл существует
        try {
          const stats = await fs.stat(path.join(process.cwd(), 'assets', asset));
          if (stats.size > 1024 * 1024) {
            issues.push(`Ассет ${asset} слишком большой (${Math.round(stats.size/1024)}KB)`);
            suggestions.push('Оптимизируйте изображения (сжатие, WebP)');
          }
        } catch {
          issues.push(`Ассет ${asset} не найден`);
        }
      }
    }

    const passed = issues.length < this.maxIssuesBeforeFail;
    return {
      stage: 'assets',
      passed,
      issues,
      suggestions,
      riskLevel: this.calculateRiskLevel(issues),
      requiresHumanReview: issues.length > 0,
    };
  }

  /**
   * Запускает проверку TypeScript
   */
  private async runTsc(code: GameCode): Promise<string[]> {
    // Создаём временную папку, пишем файлы, запускаем tsc --noEmit
    // Возвращаем массив ошибок
    return []; // Заглушка
  }

  /**
   * Проверка на запрещённый контент
   */
  private containsRestrictedContent(text: string): boolean {
    const restrictedWords = ['kill', 'blood', 'gore', 'sex', 'nude', 'violence', 'drugs'];
    return restrictedWords.some(word => text.toLowerCase().includes(word));
  }

  /**
   * Расчёт уровня риска
   */
  private calculateRiskLevel(issues: string[]): 'low' | 'medium' | 'high' {
    if (issues.length === 0) return 'low';
    if (issues.length < this.maxIssuesBeforeFail) return 'medium';
    return 'high';
  }

  /**
   * Расчёт качества на основе оценок
   */
  private calculateQualityScore(scores: any): number {
    const values = Object.values(scores).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  /**
   * Логирование
   */
  async log(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    await fs.appendFile(this.logFile, `[${timestamp}] ${message}\n`);
  }
}