// src/schemas.ts
//
// Единый источник истины для DTO, которые парсятся из ответов LLM.
// Раньше типы (src/types.ts) и промпты (src/tools/prompt-builder.ts, а также
// промпты, зашитые прямо в агентах) дублировали друг друга вручную и
// расходились (см. аудит, пункт P1-4) — например, buildConceptPrompt просил
// unique_selling_point/core_mechanic/retention_hook/complexity, которых не
// было в интерфейсе GameConcept.
//
// Теперь схема здесь — источник истины: promt-builder формирует промпт под
// неё, agents вызывают schema.parse()/safeParse() после парсинга JSON-ответа
// модели, а TypeScript-тип выводится через z.infer, а не дублируется вручную.
import { z } from 'zod';

/**
 * P-fix: LLM (особенно бесплатные модели через OpenRouter, на которых
 * работает этот пайплайн) периодически возвращают числовое поле как строку
 * ("7" вместо 7) — сам JSON при этом валиден, просто тип значения "поплыл".
 * z.number() требует строго typeof === 'number' и роняет ВСЮ схему с
 * "expected number, received string", хотя данные по сути корректны — эта
 * ошибка была системной и повторялась почти в каждом агенте (ConceptAgent,
 * NicheHunter, ConceptValidator, EconomyAgent, ProductionAgent, AssetAgent —
 * везде, где есть числовые поля).
 *
 * zNum() = z.coerce.number() — принимает и "7", и 7 (а заодно "7.5", " 7 "),
 * приводя к number ДО валидации. Это не ослабляет схему: настоящий мусор
 * ("много", "N/A") превращается в NaN, а z.number() отклоняет NaN так же,
 * как отклонял бы строку — просто с более точной причиной отказа. Обычная
 * замена z.number() на zNum() ниже, чтобы не менять поведение схем иначе.
 */
const zNum = () => z.coerce.number();

// === GameConcept (ConceptAgent) ===
export const GameConceptSchema = z.object({
  title: z.string(),
  genre: z.string(),
  description: z.string(),
  unique_selling_point: z.string(),
  core_mechanic: z.string(),
  retention_hook: z.string(),
  targetAudience: z.string(),
  // P3: платформа Яндекс Игр — это в первую очередь браузер/десктоп,
  // а не мобильный тач-экран (см. промпт-фикс в prompt-builder.ts).
  // Модель обязана явно решить и обосновать метод управления, а не
  // молча по умолчанию писать "палец/тач", как раньше.
  platformControls: z.object({
    primary: z.enum(['mouse_keyboard', 'touch', 'both']),
    rationale: z.string(),
  }),
  monetization: z.object({
    ads: z.array(z.string()).default([]),
    iap: z.array(z.string()).default([]),
    balance: z.string().default(''),
  }),
  complexity: zNum().min(1).max(10),
  // P4: раньше ConceptAgent получал только niche.description, а остальные
  // поля ниши (whyBlueOcean, potentialMechanics, existingGames) молча
  // терялись — концепция могла "уплыть" от выбранной ниши без каких-либо
  // следов этого в данных. Поле ниже не защищает от дрейфа само по себе,
  // но заставляет модель явно сформулировать связь с нишей — это то, что
  // дальше проверяет ConceptValidator.niche_adherence (см. ниже).
  nicheFit: z.string().default(''),
});
export type GameConcept = z.infer<typeof GameConceptSchema>;

// === NicheIdea (NicheHunter) ===
export const NicheIdeaSchema = z.object({
  name: z.string(),
  description: z.string(),
  whyBlueOcean: z.string(),
  existingGames: z.array(z.string()),
  potentialMechanics: z.string(),
  complexity: zNum().min(1).max(10),
  monetizationPotential: zNum().min(1).max(10),
});
export const NicheIdeaListSchema = z.array(NicheIdeaSchema);
export type NicheIdea = z.infer<typeof NicheIdeaSchema>;

// === ValidationResult (ConceptValidator) ===
export const ValidationResultSchema = z.object({
  scores: z.object({
    uniqueness: zNum().min(1).max(10),
    feasibility: zNum().min(1).max(10),
    retention_potential: zNum().min(1).max(10),
    monetization_potential: zNum().min(1).max(10),
    moderation_safety: zNum().min(1).max(10),
    market_demand: zNum().min(1).max(10),
    // P4: раньше ConceptValidator вообще не получал selectedNiche и
    // структурно не мог заметить, что концепция ушла от исходной ниши.
    // default(10) — чтобы старые сохранённые чекпоинты без этого поля не
    // ломались при повторной валидации схемой.
    niche_adherence: zNum().min(1).max(10).default(10),
  }),
  risks: z.array(z.string()),
  improvements: z.array(z.string()),
  alternatives: z.array(z.string()),
  verdict: z.enum(['approved', 'needs_work', 'rejected']),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// === GameDesignDocument (GameArchitect) ===
export const GameDesignDocumentSchema = z.object({
  concept: z.string(),
  uniqueness: z.string(),
  targetAudience: z.object({
    persona: z.string(),
    motivation: z.string(),
    painPoints: z.array(z.string()),
  }),
  coreLoop: z.object({
    perSecond: z.string(),
    perMinute: z.string(),
    perSession: z.string(),
    progression: z.string(),
  }),
  monetization: z.object({
    adFormats: z.array(z.string()),
    iap: z.array(z.string()),
    economy: z.string(),
  }),
  technicalArchitecture: z.object({
    scenes: z.array(z.string()),
    entities: z.array(z.any()),
    physics: z.string(),
    saveSystem: z.string(),
  }),
  moderationRequirements: z.array(z.string()),
  mvpFeatures: z.array(z.string()),
  risks: z.array(z.object({ risk: z.string(), mitigation: z.string() })),
});
export type GameDesignDocument = z.infer<typeof GameDesignDocumentSchema>;

// === Economy (EconomyAgent) ===
//
// P3: раньше вся экономика жила в одном текстовом поле
// GameDesignDocument.monetization.economy (z.string()) — LLM физически
// некуда было положить конкретные числа, даже если бы захотела. Здесь —
// отдельная схема, где почти всё это именно числа (HP/урон/цены/шанс
// выпадения), а не проза. Расчитано на то, чтобы результат можно было
// напрямую сериализовать в конфиг игры и скормить CodeAgent, а не
// пересказывать текстом.
export const ResourceSchema = z.object({
  name: z.string(),               // напр. "Золото", "Кристаллы"
  startingAmount: zNum(),
  earnRatePerMinute: zNum(),  // среднее пополнение в игровую минуту
});

export const EnemyBalanceEntrySchema = z.object({
  tier: zNum(),               // номер волны/уровня/этажа
  name: z.string(),
  hp: zNum(),
  damage: zNum(),
  speed: zNum(),              // px/sec — платформа Phaser, эта единица нужна CodeAgent'у напрямую
  goldReward: zNum(),
});

export const ShopItemSchema = z.object({
  name: z.string(),
  cost: zNum(),
  currency: z.string(),           // "Золото" / "Кристаллы" / "RUB" (для IAP)
  effect: z.string(),             // короткое текстовое описание эффекта, не вместо чисел, а поясняет их
});

export const UpgradeTierSchema = z.object({
  level: zNum(),
  cost: zNum(),
  effectValue: zNum(),        // напр. +damage, +hp — конкретное число прироста
  effectDescription: z.string(),
});

export const UpgradePathSchema = z.object({
  name: z.string(),
  tiers: z.array(UpgradeTierSchema),
});

export const DropTableEntrySchema = z.object({
  item: z.string(),
  chancePercent: zNum().min(0).max(100),
});

export const DropTableSchema = z.object({
  source: z.string(),             // напр. "Обычный враг", "Босс волны 5"
  drops: z.array(DropTableEntrySchema),
});

export const EconomySchema = z.object({
  resources: z.array(ResourceSchema),
  playerStats: z.object({
    startingHp: zNum(),
    startingDamage: zNum(),
    startingSpeed: zNum(),
  }),
  enemyBalance: z.array(EnemyBalanceEntrySchema),
  shop: z.array(ShopItemSchema),
  upgrades: z.array(UpgradePathSchema),
  dropTables: z.array(DropTableSchema),
  iapPrices: z.array(z.object({ item: z.string(), priceRub: zNum() })),
  // Короткие пояснения (например, формула роста сложности между волнами).
  // Дополняют числа, но не заменяют их — при конфликте числа приоритетнее.
  balanceNotes: z.array(z.string()).default([]),
});
export type Economy = z.infer<typeof EconomySchema>;

// === Production (ProductionAgent) ===
//
// P3: намеренно СЧЁТНЫЕ метрики (спрайты/классы/конфиги), а не оценки
// времени в днях/неделях — у LLM нет данных о реальной скорости конкретной
// команды/соло-разработчика, поэтому "2 недели" это красиво выглядящая, но
// необоснованная цифра. "37 спрайтов" модель оценить МОЖЕТ — это прямое
// следствие того, что она сама спроектировала в GDD/Economy.
export const ComplexityBreakdownEntrySchema = z.object({
  category: z.string(),           // "UI", "Core", "Контент", "Баланс"
  complexity: zNum().min(1).max(10),
  reasoning: z.string(),          // ОБЯЗАТЕЛЬНОЕ обоснование числа — фикс замечания "почему 5? непонятно"
});

export const ProductionSchema = z.object({
  art: z.object({
    sprites: zNum(),
    animations: zNum(),
    uiScreens: zNum(),
    vfx: zNum(),
  }),
  audio: z.object({
    musicTracks: zNum(),
    soundEffects: zNum(),
  }),
  programming: z.object({
    classes: zNum(),
    scenes: zNum(),
    configs: zNum(),          // напр. "47 игровых конфигов"
    estimatedLinesOfCode: zNum(),
  }),
  content: z.object({
    levelsOrWaves: zNum(),
    localizationStrings: zNum(),
  }),
  complexityBreakdown: z.array(ComplexityBreakdownEntrySchema),
  mvpScopeCuts: z.array(z.string()).default([]), // что явно вырезать из скоупа, чтобы уложиться в MVP
});
export type Production = z.infer<typeof ProductionSchema>;

// === AssetManifest (AssetAgent) ===
//
// Раньше ProductionAgent считал ТОЛЬКО СКОЛЬКО ассетов нужно (context.production.art/.audio —
// числа), но не КАКИЕ именно и не КУДА их класть. CodeAgent из-за этого был
// вынужден сам придумывать пути в this.load.image(...)/spritesheet(...)/audio(...),
// и эти пути были никак не согласованы с тем, что реально лежит (или не лежит)
// в assets/ — игра физически не собиралась, пока кто-то руками не находил и не
// подкладывал файлы по угаданным путям.
//
// AssetManifestSchema — источник истины по путям/именам для CodeAgent (см.
// buildCodePrompt: манифест передаётся туда как обязательный references, а
// не как "справочная информация") и одновременно ТЗ на генерацию арта/звука
// для человека (сохраняется как читаемый ASSET_BRIEF.md рядом с проектом,
// см. tools/asset-brief.ts).
//
// Дискриминированный union по `type`, а не один плоский объект с кучей
// optional-полей — чтобы Zod структурно ЗАСТАВЛЯЛ модель класть
// generationPrompt/width/height для графики и audioReference для звука, а
// не оставлял их пустыми "потому что optional можно пропустить" (тот же
// принцип, что ОБЯЗАТЕЛЬНОЕ поле reasoning в ComplexityBreakdownEntrySchema
// выше).
const AssetBaseSchema = z.object({
  // Стабильный короткий идентификатор — CodeAgent обязан использовать ЕГО
  // как key в this.load.image(id, path) / this.load.spritesheet(id, ...) /
  // this.load.audio(id, path), а не изобретать свой key.
  id: z.string(),
  // Путь в проекте, например "assets/sprites/player_idle.png". ДОЛЖЕН
  // совпадать 1-в-1 со вторым аргументом this.load.*(...) в сгенерированном
  // коде — это и есть единственная гарантия, что игра физически соберётся.
  path: z.string(),
  // Что это и где используется (сцена/сущность из GDD) — контекст для
  // человека, который будет генерировать/рисовать ассет по этому брифу.
  description: z.string(),
});

export const SpriteAssetSchema = AssetBaseSchema.extend({
  type: z.literal('sprite'),
  format: z.enum(['png', 'webp']),
  width: zNum(),
  height: zNum(),
  // Готовый промпт для Midjourney/SD/DALL-E: стиль, палитра, ракурс —
  // человек должен суметь скопировать его как есть, без доработки напильником.
  generationPrompt: z.string(),
});

export const SpritesheetAssetSchema = AssetBaseSchema.extend({
  type: z.literal('spritesheet'),
  format: z.enum(['png', 'webp']),
  // Размер ОДНОГО кадра и их количество — нужно 1-в-1 совпасть с
  // this.load.spritesheet(id, path, { frameWidth, frameHeight }) в коде.
  frameWidth: zNum(),
  frameHeight: zNum(),
  frameCount: zNum(),
  generationPrompt: z.string(),
});

export const UiAssetSchema = AssetBaseSchema.extend({
  type: z.literal('ui'),
  format: z.enum(['png', 'webp']),
  width: zNum(),
  height: zNum(),
  generationPrompt: z.string(),
});

export const SfxAssetSchema = AssetBaseSchema.extend({
  type: z.literal('sfx'),
  format: z.enum(['mp3', 'ogg']),
  // Текстовое описание/референс звука (жанр/настроение/длительность/пример
  // похожего звука) — для звука вместо generationPrompt, генерация звука по
  // текстовому промпту работает принципиально иначе, чем по картинке.
  audioReference: z.string(),
});

export const MusicAssetSchema = AssetBaseSchema.extend({
  type: z.literal('music'),
  format: z.enum(['mp3', 'ogg']),
  audioReference: z.string(),
});

export const AssetEntrySchema = z.discriminatedUnion('type', [
  SpriteAssetSchema,
  SpritesheetAssetSchema,
  UiAssetSchema,
  SfxAssetSchema,
  MusicAssetSchema,
]);
export type AssetEntry = z.infer<typeof AssetEntrySchema>;

export const AssetManifestSchema = z.object({
  // Общий визуальный стиль/палитра/ракурс — вставляется в КАЖДЫЙ
  // generationPrompt ниже, чтобы арт не расползался по стилю между
  // отдельными ассетами (одна сессия LLM это ещё держит в голове, но по
  // отдельности взятые generationPrompt без этого контекста — нет).
  styleGuide: z.object({
    artStyle: z.string(),
    colorPalette: z.array(z.string()).default([]),
    perspective: z.string().default(''),
  }),
  assets: z.array(AssetEntrySchema),
});
export type AssetManifest = z.infer<typeof AssetManifestSchema>;

// === GameCode (CodeAgent / ReviewAgent) ===
export const GameCodeSchema = z.object({
  files: z.array(z.object({ path: z.string(), content: z.string() })),
});
export type GameCode = z.infer<typeof GameCodeSchema>;

/**
 * Валидирует DTO по схеме и бросает понятную ошибку (вместо тихого прохода
 * с undefined-полями) при несовпадении. Используется во всех агентах сразу
 * после parseJsonWithRecovery.
 */
export function validateDto<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues
      .map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Ответ модели не соответствует ожидаемой схеме ${label}: ${details}`);
  }
  return result.data;
}
