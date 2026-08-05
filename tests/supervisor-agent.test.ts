// tests/supervisor-agent.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SupervisorAgent } from '../src/agents/supervisor-agent';
import { ILLMClient } from '../src/core/interfaces';
import { GameConcept, GameDesignDocument, ValidationResult } from '../src/types';

// inspectConcept/inspectDesign не вызывают LLM (чистые детерминированные
// проверки), поэтому клиент можно замокать — он не должен вызываться.
const dummyClient: ILLMClient = {
  chat: async () => {
    throw new Error('LLM не должен вызываться в этих проверках');
  },
};

function makeConcept(overrides: Partial<GameConcept> = {}): GameConcept {
  return {
    title: 'Тестовая игра',
    genre: 'puzzle',
    description: 'Обычная казуальная головоломка про сборку узоров.',
    unique_selling_point: 'Оригинальная механика подбора цветов.',
    core_mechanic: 'Игрок перетаскивает фигуры мышью.',
    retention_hook: 'Ежедневный бонус.',
    targetAudience: '18-45 casual',
    platformControls: { primary: 'mouse_keyboard', rationale: 'ПК-браузер' },
    monetization: { ads: ['rewarded'], iap: ['boosters'], balance: 'умеренный' },
    complexity: 4,
    nicheFit: 'Реализует нишу без отклонений.',
    ...overrides,
  };
}

function makeValidation(overrides: Partial<ValidationResult['scores']> = {}): ValidationResult {
  return {
    scores: {
      uniqueness: 8,
      feasibility: 8,
      retention_potential: 7,
      monetization_potential: 7,
      moderation_safety: 9,
      market_demand: 8,
      niche_adherence: 8,
      ...overrides,
    },
    risks: [],
    improvements: [],
    alternatives: [],
    verdict: 'approved',
  };
}

test('inspectConcept: чистая концепция без платформенных проблем проходит', async () => {
  const supervisor = new SupervisorAgent(dummyClient);
  const report = await supervisor.inspectConcept(makeConcept(), makeValidation());
  assert.equal(report.passed, true);
  assert.equal(report.riskLevel, 'low');
});

test('inspectConcept: голосовой чат в core_mechanic форсирует high risk и блокирует', async () => {
  const supervisor = new SupervisorAgent(dummyClient);
  const concept = makeConcept({
    core_mechanic: 'Игроки координируются через голосовой чат WebRTC во время матча.',
  });
  const report = await supervisor.inspectConcept(concept, makeValidation());
  assert.equal(report.passed, false);
  assert.equal(report.riskLevel, 'high');
  assert.ok(report.issues.some((i) => i.includes('нереализуемую на платформе')));
});

test('inspectConcept: крипто-платежи в USP тоже ловятся', async () => {
  const supervisor = new SupervisorAgent(dummyClient);
  const concept = makeConcept({
    unique_selling_point: 'Внутриигровая экономика на крипто-платежах, минуя магазин Яндекса.',
  });
  const report = await supervisor.inspectConcept(concept, makeValidation());
  assert.equal(report.riskLevel, 'high');
});

test('inspectDesign: упоминание Discord в mvpFeatures блокирует GDD', async () => {
  const supervisor = new SupervisorAgent(dummyClient);
  const gdd: GameDesignDocument = {
    concept: 'Кооперативная головоломка',
    uniqueness: 'Асимметричные роли',
    targetAudience: { persona: 'casual 25+', motivation: 'релакс', painPoints: ['скука'] },
    coreLoop: { perSecond: 'клик', perMinute: 'решение паззла', perSession: '5-10 мин', progression: 'уровни' },
    monetization: { adFormats: ['interstitial'], iap: ['hints'], economy: 'подсказки за монеты' },
    technicalArchitecture: {
      scenes: ['Boot', 'Menu', 'Game', 'UI', 'Result'],
      entities: [],
      physics: 'Arcade',
      saveSystem: 'localStorage',
    },
    moderationRequirements: ['пауза при сворачивании'],
    mvpFeatures: ['Интеграция с Discord для приглашения друзей', 'Базовый уровень', 'Меню'],
    risks: [],
  };
  const report = await supervisor.inspectDesign(gdd);
  assert.equal(report.passed, false);
  assert.equal(report.riskLevel, 'high');
});
