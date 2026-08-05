// src/agents/production-agent.ts
import { BaseAgent } from './base-agent';
import { parseJsonWithRecovery } from '../tools/json-cleaner';
import { ProductionSchema, validateDto } from '../schemas';
import { PipelineContext, GameDesignDocument, Economy, Production } from '../types';

/**
 * P3: раньше единственной оценкой объёма работы было
 * GameConcept.complexity — одно число 1-10 без объяснения ("написано 5,
 * но почему — непонятно"). ProductionAgent даёт СЧЁТНЫЕ метрики (спрайты,
 * классы, конфиги — то, что LLM действительно может оценить по GDD/Economy),
 * а не оценки в днях/неделях (это LLM оценить не может — у неё нет данных
 * о скорости конкретного разработчика). complexityBreakdown требует
 * обязательного текстового обоснования для каждой цифры сложности.
 */
export class ProductionAgent extends BaseAgent {
  async run(context: PipelineContext): Promise<PipelineContext> {
    console.log('🏗️ Оценка объёма продакшна...');

    if (!context.gdd) {
      throw new Error('GDD не сгенерирован. Сначала выполните GameArchitect.');
    }
    if (!context.economy) {
      throw new Error('Экономика не рассчитана. Сначала выполните EconomyAgent.');
    }

    try {
      const production = await this.estimate(context.gdd, context.economy, context);
      context.production = production;
      this.updateContext(context, 'Production estimation completed');
      console.log('✅ Оценка продакшна готова');
      return context;
    } catch (error) {
      console.error('❌ Ошибка в ProductionAgent:', error);
      context.errors.push(`ProductionAgent: ${error}`);
      throw error;
    }
  }

  private async estimate(gdd: GameDesignDocument, economy: Economy, context: PipelineContext): Promise<Production> {
    const prompt = `Ты — продюсер инди-разработки, специализирующийся на оценке объёма работ для 2D-игр на Phaser 3.

Задание: оценить объём продакшна для игры на основе GDD и рассчитанной экономики.

GDD:
${JSON.stringify(gdd, null, 2)}

Экономика/баланс (уже посчитан — используй как основу для оценки количества
сущностей: например, число записей в enemyBalance/shop/upgrades напрямую
подсказывает, сколько спрайтов/конфигов потребуется):
${JSON.stringify(economy, null, 2)}

Верни строго JSON со следующими полями. ВАЖНО: НЕ указывай оценки в днях,
неделях или часах — у тебя нет данных о скорости конкретного разработчика,
такие оценки были бы необоснованной "псевдо-точностью". Вместо этого — только
СЧЁТНЫЕ метрики (сколько штук), которые действительно можно вывести из GDD и
экономики:

1. art (объект { sprites, animations, uiScreens, vfx }) — количество
   спрайтов/анимаций/экранов UI/визуальных эффектов, конкретными числами.
2. audio (объект { musicTracks, soundEffects }) — количество треков и
   звуковых эффектов.
3. programming (объект { classes, scenes, configs, estimatedLinesOfCode }) —
   количество классов, сцен, конфигурационных файлов и примерный объём кода
   в строках.
4. content (объект { levelsOrWaves, localizationStrings }) — количество
   уровней/волн (согласовано с enemyBalance из экономики) и строк локализации.
5. complexityBreakdown (массив объектов { category, complexity, reasoning }) —
   разбивка сложности по категориям (например "UI", "Core", "Контент",
   "Баланс"), где reasoning — ОБЯЗАТЕЛЬНОЕ краткое объяснение, ПОЧЕМУ именно
   такая оценка (не общими словами, а со ссылкой на конкретные числа из GDD
   или экономики: например "5/10 — 8 волн врагов и 3 ветки прокачки, но UI
   всего 3 экрана").
6. mvpScopeCuts (массив строк) — что можно явно вырезать из скоупа, чтобы
   уложиться в минимальный жизнеспособный продукт (что не критично для
   первой версии).`;

    const response = await this.callWithRetry(
      async () => {
        return await this.openRouter.chat(
          [
            { role: 'system', content: 'Ты — продюсер инди-разработки. Отвечай только валидным JSON, оценки — только в счётных единицах (штуки), без дней/недель/часов.' },
            { role: 'user', content: prompt },
          ],
          {
            task: 'reasoning',
            temperature: 0.5,
            useCache: true,
            maxTokens: 32768,
          }
        );
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        retryableErrors: ['429', '500', '502', '503', '504'],
      }
    );

    if (!response?.content) {
      throw new Error('Модель вернула пустой ответ');
    }

    console.log('📝 Сырой ответ модели (первые 200 символов):', response.content.substring(0, 200) + '...');

    if (response.usage) {
      context.tokenUsage = (context.tokenUsage || 0) + response.usage.totalTokens;
    }

    try {
      const raw = parseJsonWithRecovery<unknown>(response.content);
      const production = validateDto(ProductionSchema, raw, 'Production');
      console.log('✅ Парсинг JSON успешен');
      return production;
    } catch (parseError: any) {
      console.error('❌ Ошибка парсинга JSON. Полный сырой ответ (первые 1000 символов):', response.content.substring(0, 1000));
      throw new Error(`Не удалось распарсить ответ модели: ${parseError.message}`);
    }
  }
}
