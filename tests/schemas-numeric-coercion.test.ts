// tests/schemas-numeric-coercion.test.ts
//
// Регрессионный тест на баг из реального прогона: бесплатные LLM-модели
// через OpenRouter периодически возвращают числовые поля как строки
// ("7" вместо 7) в остальном валидном JSON. Раньше это роняло всю схему
// (z.number() строго требует typeof === 'number') и повторялось почти в
// каждом агенте — ConceptAgent, NicheHunter, ConceptValidator, EconomyAgent,
// ProductionAgent, AssetAgent. Схемы теперь используют zNum() =
// z.coerce.number() вместо z.number() (см. src/schemas.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GameConceptSchema,
  NicheIdeaSchema,
  ValidationResultSchema,
  EconomySchema,
  ProductionSchema,
} from '../src/schemas';

test('GameConceptSchema: complexity как строка "7" (реальный случай из лога) проходит валидацию', () => {
  const raw = {
    title: 'Экспедиция Карт',
    genre: 'roguelike deckbuilder',
    description: 'desc',
    unique_selling_point: 'usp',
    core_mechanic: 'mechanic',
    retention_hook: 'hook',
    targetAudience: 'aud',
    platformControls: { primary: 'mouse_keyboard', rationale: 'r' },
    monetization: { ads: [], iap: [], balance: '' },
    complexity: '7',
    nicheFit: '',
  };
  const result = GameConceptSchema.safeParse(raw);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.complexity, 7);
    assert.equal(typeof result.data.complexity, 'number');
  }
});

test('GameConceptSchema: реальный текстовый мусор в числовом поле всё ещё отклоняется', () => {
  const raw = {
    title: 't',
    genre: 'g',
    description: 'd',
    unique_selling_point: 'u',
    core_mechanic: 'm',
    retention_hook: 'h',
    targetAudience: 'a',
    platformControls: { primary: 'mouse_keyboard', rationale: 'r' },
    monetization: { ads: [], iap: [], balance: '' },
    complexity: 'много',
  };
  const result = GameConceptSchema.safeParse(raw);
  assert.equal(result.success, false);
});

test('NicheIdeaSchema: complexity/monetizationPotential как строки принимаются', () => {
  const result = NicheIdeaSchema.safeParse({
    name: 'n',
    description: 'd',
    whyBlueOcean: 'w',
    existingGames: [],
    potentialMechanics: 'p',
    complexity: '4',
    monetizationPotential: '8',
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.complexity, 4);
    assert.equal(result.data.monetizationPotential, 8);
  }
});

test('ValidationResultSchema: все оценки в scores как строки принимаются', () => {
  const result = ValidationResultSchema.safeParse({
    scores: {
      uniqueness: '7',
      feasibility: '6',
      retention_potential: '5',
      monetization_potential: '8',
      moderation_safety: '10',
      market_demand: '6',
      niche_adherence: '9',
    },
    risks: [],
    improvements: [],
    alternatives: [],
    verdict: 'approved',
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.scores.uniqueness, 7);
    assert.equal(result.data.scores.niche_adherence, 9);
  }
});

test('EconomySchema: числа во вложенных массивах (enemyBalance) как строки принимаются', () => {
  const result = EconomySchema.safeParse({
    resources: [{ name: 'Золото', startingAmount: '100', earnRatePerMinute: '5' }],
    playerStats: { startingHp: '100', startingDamage: '10', startingSpeed: '200' },
    enemyBalance: [{ tier: '1', name: 'Гоблин', hp: '20', damage: '5', speed: '50', goldReward: '10' }],
    shop: [],
    upgrades: [],
    dropTables: [],
    iapPrices: [],
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.resources[0].startingAmount, 100);
    assert.equal(result.data.enemyBalance[0].hp, 20);
  }
});

test('ProductionSchema: счётные метрики как строки принимаются', () => {
  const result = ProductionSchema.safeParse({
    art: { sprites: '10', animations: '3', uiScreens: '4', vfx: '2' },
    audio: { musicTracks: '2', soundEffects: '15' },
    programming: { classes: '8', scenes: '5', configs: '3', estimatedLinesOfCode: '2000' },
    content: { levelsOrWaves: '8', localizationStrings: '50' },
    complexityBreakdown: [{ category: 'Core', complexity: '5', reasoning: 'r' }],
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.art.sprites, 10);
    assert.equal(result.data.programming.estimatedLinesOfCode, 2000);
  }
});
