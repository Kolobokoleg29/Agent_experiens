// src/agents/concept-validator.ts
import { BaseAgent } from './base-agent';
import { parseJsonWithRecovery } from '../tools/json-cleaner';
import { ValidationResultSchema, validateDto } from '../schemas';
import { PipelineContext, GameConcept, ValidationResult, NicheIdea } from '../types';
import { wrapExternalContent } from '../tools/sanitize';
import * as fs from 'fs/promises';
import * as path from 'path';

// Раньше criterion moderation_safety оценивался LLM "на глазок", без опоры
// на реальные правила модерации Яндекс.Игр — модель просто угадывала по
// общим представлениям о том, что "наверное запрещено". Если в корне
// проекта лежит файл moderation-checklist.md (свой чек-лист требований
// модерации), он подгружается один раз и передаётся валидатору как
// справочные данные. Если файла нет — явно предупреждаем модель, что
// проверка идёт без опоры на реальный чек-лист, а не молча гадаем.
let cachedModerationChecklist: string | null | undefined;

async function loadModerationChecklist(): Promise<string | null> {
  if (cachedModerationChecklist !== undefined) return cachedModerationChecklist;
  try {
    const filePath = path.join(process.cwd(), 'moderation-checklist.md');
    cachedModerationChecklist = await fs.readFile(filePath, 'utf-8');
  } catch {
    cachedModerationChecklist = null;
  }
  return cachedModerationChecklist;
}

export class ConceptValidator extends BaseAgent {
  async run(context: PipelineContext): Promise<PipelineContext> {
    console.log('🔍 Валидация концепции...');

    if (!context.concept) {
      throw new Error('Концепция не сгенерирована. Сначала выполните ConceptAgent.');
    }

    try {
      const validation = await this.validate(context.concept, context);
      context.validation = validation;
      this.updateContext(context, `Concept validation completed: ${validation.verdict}`);
      console.log(`📊 Вердикт: ${validation.verdict}`);
      return context;
    } catch (error) {
      console.error('❌ Ошибка в ConceptValidator:', error);
      context.errors.push(`ConceptValidator: ${error}`);
      throw error;
    }
  }

  private async validate(concept: GameConcept, context: PipelineContext): Promise<ValidationResult> {
    console.log('🧠 Критический анализ концепции...');

    // P4: раньше валидатор не получал selectedNiche и структурно не мог
    // заметить дрейф концепции от исходной ниши. Теперь ниша — часть
    // промпта, а расхождение с ней — отдельный, обязательный к оценке
    // критерий (niche_adherence).
    const niche: NicheIdea | undefined = context.selectedNiche;
    const nicheBlock = niche
      ? wrapExternalContent(
          'исходная ниша (из NicheHunter/NicheSelectionStage)',
          `Название: ${niche.name}\nОписание: ${niche.description}\nПочему "голубой океан": ${niche.whyBlueOcean || '(не указано)'}\nПотенциальная механика: ${niche.potentialMechanics || '(не указано)'}`
        )
      : '(ниша не была выбрана — критерий niche_adherence можно поставить 10)';

    const checklist = await loadModerationChecklist();
    const moderationBlock = checklist
      ? wrapExternalContent('чек-лист требований модерации Яндекс Игр', checklist, 6000)
      : '(файл moderation-checklist.md не найден в корне проекта — оценивай moderation_safety по общим знаниям о правилах Яндекс.Игр и будь консервативнее в оценке, явно отметь в risks, что чек-лист не подключён)';

    const prompt = `
Ты — строгий и объективный критик игровых концепций. 
Твоя задача — провести детальный анализ и выставить объективные оценки.

Исходная ниша, из которой должна была вырасти концепция:
${nicheBlock}

Чек-лист требований модерации Яндекс Игр (используй его как основной источник
истины при оценке критерия "Модерационная безопасность" ниже, а не только
общие представления о правилах платформы):
${moderationBlock}

Концепция:
${JSON.stringify(concept, null, 2)}

Критерии оценки (от 1 до 10):
1. Уникальность: насколько идея отличается от существующих игр? 
   (10 — революционная, 1 — точная копия).
2. Реализуемость: реально ли сделать MVP за 1-2 недели соло?
   (10 — можно за 3 дня, 1 — нужно 6 месяцев).
3. Retention: будет ли игрок возвращаться? Оцени механизм удержания.
4. Монетизация: насколько игра может генерировать доход (средний ARPU)?
5. Модерационная безопасность: риск отказа при модерации Яндекс.Игр.
6. Рыночный спрос: есть ли аудитория, готовая играть в такую игру?
7. Соответствие нише (niche_adherence): сохранила ли концепция ключевую
   механику и суть "голубого океана" исходной ниши, указанной выше — а не
   просто её название? (10 — концепция явно реализует именно эту нишу,
   1 — концепция про другую игру, к нише отношения не имеет).

Дополнительно:
- Выяви главные риски (технические, юридические, маркетинговые).
- Предложи конкретные улучшения (не общие фразы).
- Предложи альтернативные механики, которые повысят уникальность/реализуемость.

Вердикт:
- "approved" — если средний балл >= 6 И (feasibility >= 6 И uniqueness >= 6 И niche_adherence >= 6) И нет критических рисков.
- "needs_work" — если средний балл 4-6, или niche_adherence < 6 (концепция ушла от ниши — это тоже риск, а не бесплатное творчество), или есть риски, но их можно устранить.
- "rejected" — если средний балл < 4 или есть непреодолимые риски.

Если niche_adherence < 6, ОБЯЗАТЕЛЬНО добавь в improvements явное указание,
какую механику/идею из исходной ниши нужно вернуть в концепцию.

Формат ответа (строго JSON):
{
  "scores": { 
    "uniqueness": 8, 
    "feasibility": 7, 
    "retention_potential": 6, 
    "monetization_potential": 7, 
    "moderation_safety": 9, 
    "market_demand": 8,
    "niche_adherence": 8
  },
  "risks": ["риск 1", "риск 2"],
  "improvements": ["улучшение 1", "улучшение 2"],
  "alternatives": ["альтернатива 1", "альтернатива 2"],
  "verdict": "approved" | "needs_work" | "rejected"
}
`;

    const systemPrompt = 'Ты — строгий, но справедливый критик 2D-игровых концепций. Отвечай только валидным JSON.';

    // === ИСПОЛЬЗУЕМ ЦЕНТРАЛИЗОВАННЫЙ РЕТРАЙ ===
    const response = await this.callWithRetry(
      async () => {
        return await this.openRouter.chat(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          {
            task: 'reasoning',
            temperature: 0.5,
            useCache: true,
            maxTokens: 8192,
          }
        );
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        retryableErrors: ['429', '500', '502', '503', '504'],
      }
    );

    console.log('📝 Сырой ответ модели (первые 200 символов):', response.content.substring(0, 200) + '...');

    // P1-7: реальный учёт токенов вместо всегда-0 context.tokenUsage
    if (response.usage) {
      context.tokenUsage = (context.tokenUsage || 0) + response.usage.totalTokens;
    }

    // === ПАРСИНГ С ФОЛБЭКАМИ (единая функция вместо самописного псевдо-retry) ===
    try {
      const raw = parseJsonWithRecovery<unknown>(response.content);
      const result = validateDto(ValidationResultSchema, raw, 'ValidationResult');
      console.log('✅ Парсинг JSON успешен');
      return result;
    } catch (parseError: any) {
      console.error('❌ Ошибка парсинга JSON:', parseError.message);
      throw new Error(`Не удалось распарсить ответ модели: ${parseError.message}`);
    }
  }
}