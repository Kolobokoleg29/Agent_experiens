// src/agents/economy-agent.ts
import { BaseAgent } from './base-agent';
import { parseJsonWithRecovery } from '../tools/json-cleaner';
import { EconomySchema, validateDto } from '../schemas';
import { PipelineContext, GameDesignDocument, Economy } from '../types';

/**
 * P3: раньше экономика жила одной строкой в GDD.monetization.economy —
 * ни HP врагов, ни цены в магазине, ни шанс выпадения предметов нигде не
 * фиксировались как числа, и CodeAgent'у приходилось выдумывать баланс
 * заново при генерации кода. EconomyAgent считает конкретные цифры один
 * раз, синхронизированно (враги/цены/дроп друг другу не противоречат),
 * и это единственный источник истины по балансу для CodeAgent.
 */
export class EconomyAgent extends BaseAgent {
  async run(context: PipelineContext): Promise<PipelineContext> {
    console.log('💰 Расчёт игровой экономики и баланса...');

    if (!context.gdd) {
      throw new Error('GDD не сгенерирован. Сначала выполните GameArchitect.');
    }

    try {
      const economy = await this.calculate(context.gdd, context);
      context.economy = economy;
      this.updateContext(context, 'Economy calculation completed');
      console.log('✅ Экономика рассчитана');
      return context;
    } catch (error) {
      console.error('❌ Ошибка в EconomyAgent:', error);
      context.errors.push(`EconomyAgent: ${error}`);
      throw error;
    }
  }

  private async calculate(gdd: GameDesignDocument, context: PipelineContext): Promise<Economy> {
    const prompt = `Ты — гейм-дизайнер, специализирующийся на балансе и внутриигровой экономике.

Задание: рассчитать конкретный числовой баланс для игры на основе её GDD:

${JSON.stringify(gdd, null, 2)}

Верни строго JSON со следующими полями (ВСЁ, что может быть числом — ДОЛЖНО
быть числом, а не текстовым описанием; текстовые пояснения разрешены только
в balanceNotes и только КАК ДОПОЛНЕНИЕ к числам, а не вместо них):

1. resources (массив объектов { name, startingAmount, earnRatePerMinute }) —
   игровые ресурсы (золото, кристаллы и т.п.), стартовое количество и
   средний темп прироста в игровую минуту.
2. playerStats (объект { startingHp, startingDamage, startingSpeed }) —
   стартовые характеристики игрока конкретными числами.
3. enemyBalance (массив объектов { tier, name, hp, damage, speed, goldReward }) —
   баланс врагов/уровней сложности по волнам/этажам/уровням (минимум 5-8
   записей с прогрессией сложности, числа должны РАСТИ по разумной кривой,
   не рандомно).
4. shop (массив объектов { name, cost, currency, effect }) — магазин с
   конкретными ценами.
5. upgrades (массив объектов { name, tiers: [{ level, cost, effectValue, effectDescription }] }) —
   ветки прокачки с числами по уровням.
6. dropTables (массив объектов { source, drops: [{ item, chancePercent }] }) —
   таблицы выпадения предметов с процентами (сумма процентов по одному
   source может быть меньше 100 — остаток это "ничего не выпало").
7. iapPrices (массив объектов { item, priceRub }) — конкретные цены
   внутриигровых покупок в рублях, реалистичные для казуальной аудитории.
8. balanceNotes (массив строк) — краткие пояснения к формулам/логике роста
   сложности (например, "HP врага растёт на ~30% за волну"), НЕ дублируй
   тут числа, которые уже есть в полях выше.

Учитывай сессии 5-15 минут и целевую аудиторию из GDD. Числа должны быть
внутренне непротиворечивы (например, награда золота за врага должна быть
соразмерна ценам в магазине).`;

    const response = await this.callWithRetry(
      async () => {
        return await this.openRouter.chat(
          [
            { role: 'system', content: 'Ты — гейм-дизайнер по балансу и экономике игр. Отвечай только валидным JSON, все численные величины — числа, а не строки.' },
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
      const economy = validateDto(EconomySchema, raw, 'Economy');
      console.log('✅ Парсинг JSON успешен');
      this.checkDropTableSanity(economy, context);
      return economy;
    } catch (parseError: any) {
      console.error('❌ Ошибка парсинга JSON. Полный сырой ответ (первые 1000 символов):', response.content.substring(0, 1000));
      throw new Error(`Не удалось распарсить ответ модели: ${parseError.message}`);
    }
  }

  /**
   * Дешёвая детерминированная проверка (без LLM): каждая таблица дропа
   * может суммарно давать ≤100% (остаток — "ничего не выпало"), Zod-схема
   * это не проверяет (каждый chancePercent валиден сам по себе, 0-100).
   * Если сумма >100%, это баг баланса, который иначе всплывёт только в
   * ревью кода или вообще не будет замечен. Пишем предупреждение в
   * context.warnings, не блокируя пайплайн — экономику это не решает
   * автоматически, но делает проблему видимой человеку.
   */
  private checkDropTableSanity(economy: Economy, context: PipelineContext): void {
    for (const table of economy.dropTables || []) {
      const total = (table.drops || []).reduce((sum, d) => sum + (d.chancePercent || 0), 0);
      if (total > 100) {
        const msg = `EconomyAgent: таблица дропа "${table.source}" суммарно даёт ${total}% (>100%) — баланс не сходится`;
        console.warn(`⚠️ ${msg}`);
        context.warnings.push(msg);
      }
    }
  }
}
