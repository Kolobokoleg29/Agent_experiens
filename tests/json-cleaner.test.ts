// tests/json-cleaner.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonWithRecovery } from '../src/tools/json-cleaner';

test('parseJsonWithRecovery: чистый объект', () => {
  const r = parseJsonWithRecovery<{ a: number }>('{"a": 1}');
  assert.equal(r.a, 1);
});

test('parseJsonWithRecovery: чистый массив', () => {
  const r = parseJsonWithRecovery<number[]>('[1,2,3]');
  assert.equal(r.length, 3);
});

test('parseJsonWithRecovery: markdown-обёртка ```json fences', () => {
  const r = parseJsonWithRecovery<{ a: number }>('Вот результат:\n```json\n{"a": 42}\n```\nСпасибо.');
  assert.equal(r.a, 42);
});

test('parseJsonWithRecovery: висячая запятая перед закрывающей скобкой', () => {
  const r = parseJsonWithRecovery<{ a: number; b: number }>('{"a": 1, "b": 2,}');
  assert.equal(r.b, 2);
});

test('parseJsonWithRecovery: одинарные кавычки в значении', () => {
  const r = parseJsonWithRecovery<{ name: string }>(`{"name": 'test'}`);
  assert.equal(r.name, 'test');
});

test('parseJsonWithRecovery: мусорный текст бросает информативную ошибку', () => {
  assert.throws(
    () => parseJsonWithRecovery('это не JSON вообще, просто текст без скобок'),
    /JSON/
  );
});

// P3: регрессионные тесты на реальный баг из NicheHunter — модель цитирует
// название игры прямыми кавычками внутри строкового значения.
test('parseJsonWithRecovery: незаэкранированная кавычка внутри описания, за ней запятая-пунктуация', () => {
  const r: any = parseJsonWithRecovery(`[
    {
      "name": "Ниша",
      "description": "Экшен в стиле "Boom Beach", где игрок строит базу",
      "existingGames": ["Clash of Clans", "Boom Beach"]
    }
  ]`);
  assert.equal(r.length, 1);
  assert.equal(r[0].existingGames.length, 2);
});

test('parseJsonWithRecovery: ответ обрывается по лимиту токенов посреди вложенного массива объектов', () => {
  const r: any = parseJsonWithRecovery(`[
    {
      "name": "Ниша 1",
      "existingGames": ["Game A", "Game B"],
      "potentialMechanics": "стройка баз, коопер`);
  assert.equal(r.length, 1);
  assert.equal(r[0].name, 'Ниша 1');
});

test('parseJsonWithRecovery: незаэкранированные кавычки в нескольких объектах сразу + обрыв ответа', () => {
  const r: any = parseJsonWithRecovery(`[
    {
      "name": "Ниша 1",
      "description": "Игра в стиле "Clash Royale" с элементами",
      "existingGames": ["A", "B"],
      "complexity": 5
    },
    {
      "name": "Ниша 2",
      "description": "Ещё одна ниша в духе "Boom Beach`);
  assert.equal(r.length, 2);
  assert.equal(r[1].name, 'Ниша 2');
});
