// src/agents/game-architect.ts
import { BaseAgent } from './base-agent';
import { parseJsonWithRecovery } from '../tools/json-cleaner';
import { GameDesignDocumentSchema, validateDto } from '../schemas';
import { PipelineContext, GameConcept, GameDesignDocument } from '../types';

export class GameArchitect extends BaseAgent {
  async run(context: PipelineContext): Promise<PipelineContext> {
    console.log('📐 Создание детального Game Design Document для 2D-игры...');

    if (!context.concept) {
      throw new Error('Концепция не сгенерирована. Сначала выполните ConceptAgent.');
    }

    try {
      const gdd = await this.design(context.concept, context);
      context.gdd = gdd;
      this.updateContext(context, 'GDD generation completed');
      console.log('✅ GDD успешно сгенерирован');
      return context;
    } catch (error) {
      console.error('❌ Ошибка в GameArchitect:', error);
      context.errors.push(`GameArchitect: ${error}`);
      throw error;
    }
  }

  private async design(concept: GameConcept, context: PipelineContext): Promise<GameDesignDocument> {
    // P4: раньше GameArchitect получал только concept — одобренные
    // improvements/risks из ConceptValidator (например, конкретные
    // UX-правки или риски, которые нужно митигировать) нигде не
    // передавались дальше и терялись между VerdictGateStage и DesignStage,
    // хотя формально считались учтёнными. Теперь они явно включаются в
    // промпт как обязательные требования к дизайну.
    const validation = context.validation;
    const validationBlock = validation && (validation.improvements.length > 0 || validation.risks.length > 0)
      ? `
Одобренная валидация концепции (учти это ОБЯЗАТЕЛЬНО при проектировании GDD —
это не пожелания, а требования, которые уже были согласованы на предыдущем
этапе; если какое-то улучшение не попадёт в GDD, явно укажи причину в risks):
- Одобренные улучшения, которые ДОЛЖНЫ быть отражены в дизайне: ${validation.improvements.join('; ') || '(нет)'}
- Известные риски, которые нужно митигировать в дизайне (через risks/mitigation ниже): ${validation.risks.join('; ') || '(нет)'}
`
      : '';

    const prompt = `Ты — ведущий гейм-архитектор с опытом создания 2D-игр на Phaser 3.

Задание: разработать детальный Game Design Document (GDD) для концепции:

${JSON.stringify(concept, null, 2)}
${validationBlock}
Платформенные ограничения (ОБЯЗАТЕЛЬНО учитывай в technicalArchitecture и
mvpFeatures — не предлагай ничего, что физически невозможно на платформе):
- Игра — HTML5, встроена в браузерный iframe Яндекс Игр, никакого нативного
  клиента и доступа к произвольным устройствам/ОС.
- Единственный внешний SDK — Yandex Games SDK (реклама, IAP, лидерборды,
  облачные сохранения, шаринг). Никаких других сторонних SDK/сервисов.
- ЗАПРЕЩЕНО закладывать в архитектуру: голосовой чат (WebRTC и аналоги),
  доступ к камере/микрофону, интеграции с Discord/Telegram/соцсетями как
  игровую механику, крипто-платежи и любые платежи в обход Yandex Games SDK,
  полноценный real-time мультиплеер с выделенным сервером (если это не было
  явно частью концепции), push-уведомления, доступ к файловой системе
  пользователя вне localStorage/облачных сохранений Yandex SDK.
- saveSystem может быть только localStorage и/или Yandex SDK cloud saves.

Структура GDD (верни строго JSON со следующими полями):

1. concept (строка) — краткое описание игры (1-2 предложения).
2. uniqueness (строка) — в чём главное отличие от конкурентов.
3. targetAudience (объект):
   - persona (строка) — описание типичного игрока (возраст, интересы, платёжеспособность).
   - motivation (строка) — почему этот игрок будет играть.
   - painPoints (массив) — какие проблемы игрока решает игра.
4. coreLoop (объект):
   - perSecond (строка) — что делает игрок каждую секунду.
   - perMinute (строка) — что делает игрок каждую минуту.
   - perSession (строка) — что делает игрок каждую сессию.
   - progression (строка) — как развивается игра (уровни, престижи, открытия).
5. monetization (объект):
   - adFormats (массив) — какие форматы рекламы и когда.
   - iap (массив) — список внутриигровых покупок.
   - economy (строка) — КРАТКОЕ (1-2 предложения) качественное описание принципа
     экономики (что на что конвертируется). Конкретные числа (HP/цены/дроп)
     сюда не нужны — их отдельно посчитает Economy Agent на следующем шаге.
6. technicalArchitecture (объект):
   - scenes (массив) — список сцен (Boot, Menu, Game, UI, Result).
   - entities (массив) — ключевые сущности (игрок, враги, объекты) с их свойствами и методами.
   - physics (строка) — тип физики (Arcade).
   - saveSystem (строка) — как сохраняется прогресс (localStorage / Yandex SDK).
7. moderationRequirements (массив) — список требований для модерации Яндекс.Игр (например, "игра приостанавливается при сворачивании").
8. mvpFeatures (массив) — список фич, которые нужно реализовать в MVP за 1-2 недели (не более 5-7 пунктов).
9. risks (массив объектов) — список рисков с mitigation (конкретный план, как снизить риск).

Важно: не упоминай названия существующих игр (например, "как в Slay the Spire")
нигде в тексте GDD — опиши механики своими словами. Названия конкурентов —
задача анализа рынка, а не дизайн-документа.
`;

    // === ИСПОЛЬЗУЕМ ЦЕНТРАЛИЗОВАННЫЙ РЕТРАЙ ===
    const response = await this.callWithRetry(
      async () => {
        return await this.openRouter.chat(
          [
            { role: 'system', content: 'Ты — ведущий гейм-архитектор с 10+ лет опыта, специализирующийся на 2D-играх. Отвечай только валидным JSON.' },
            { role: 'user', content: prompt },
          ],
          {
            task: 'reasoning',
            temperature: 0.7,
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

    // P1-7: реальный учёт токенов вместо всегда-0 context.tokenUsage
    if (response.usage) {
      context.tokenUsage = (context.tokenUsage || 0) + response.usage.totalTokens;
    }

    // === ПАРСИНГ С ФОЛБЭКАМИ (единая функция вместо локального дубликата) ===
    try {
      const raw = parseJsonWithRecovery<unknown>(response.content);
      const gdd = validateDto(GameDesignDocumentSchema, raw, 'GameDesignDocument');
      console.log('✅ Парсинг JSON успешен');
      return gdd;
    } catch (parseError: any) {
      console.error('❌ Ошибка парсинга JSON. Полный сырой ответ (первые 1000 символов):', response.content.substring(0, 1000));
      throw new Error(`Не удалось распарсить ответ модели: ${parseError.message}`);
    }
  }
}