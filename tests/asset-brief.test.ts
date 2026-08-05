// tests/asset-brief.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAssetBrief } from '../src/tools/asset-brief';
import { AssetManifest } from '../src/types';

const manifest: AssetManifest = {
  styleGuide: {
    artStyle: 'flat vector, мультяшный, толстый чёрный контур',
    colorPalette: ['#FFD166', '#06D6A0'],
    perspective: 'top-down',
  },
  assets: [
    {
      id: 'coin',
      path: 'assets/sprites/coin.png',
      type: 'sprite',
      description: 'Иконка монеты в магазине',
      format: 'png',
      width: 64,
      height: 64,
      generationPrompt: 'flat vector coin icon, gold, top-down, transparent background',
    },
    {
      id: 'player_run',
      path: 'assets/spritesheets/player_run.png',
      type: 'spritesheet',
      description: 'Бег игрока',
      format: 'png',
      frameWidth: 32,
      frameHeight: 48,
      frameCount: 6,
      generationPrompt: 'flat vector character run cycle, 6 frames, top-down',
    },
    {
      id: 'btn_start',
      path: 'assets/ui/btn_start.png',
      type: 'ui',
      description: 'Кнопка старта в главном меню',
      format: 'png',
      width: 200,
      height: 64,
      generationPrompt: 'flat vector UI button, rounded corners, "Start" label area',
    },
    {
      id: 'coin_pickup',
      path: 'assets/sfx/coin_pickup.mp3',
      type: 'sfx',
      description: 'Звук подбора монеты',
      format: 'mp3',
      audioReference: 'короткий яркий "дзынь", 0.3-0.5 сек, похоже на классические аркадные пикапы',
    },
    {
      id: 'main_theme',
      path: 'assets/music/main_theme.mp3',
      type: 'music',
      description: 'Фоновая музыка основной сцены',
      format: 'mp3',
      audioReference: 'лёгкий бодрый чиптюн-луп, 100-120 BPM, ~60 сек с бесшовной петлёй',
    },
  ],
};

test('renderAssetBrief: включает заголовок игры и style guide', () => {
  const md = renderAssetBrief(manifest, 'Экспедиция Ребусов');
  assert.equal(md.includes('# Бриф ассетов — Экспедиция Ребусов'), true);
  assert.equal(md.includes('flat vector, мультяшный'), true);
  assert.equal(md.includes('#FFD166, #06D6A0'), true);
  assert.equal(md.includes('top-down'), true);
});

test('renderAssetBrief: пути и id совпадают с тем, что должно быть в this.load.*(...)', () => {
  const md = renderAssetBrief(manifest, 'Тест');
  assert.equal(md.includes('assets/sprites/coin.png'), true);
  assert.equal(md.includes('`coin`'), true);
  assert.equal(md.includes('assets/spritesheets/player_run.png'), true);
  assert.equal(md.includes('32×48px'), true); // кадр спрайт-листа
  assert.equal(md.includes('Кадров:** 6'), true);
});

test('renderAssetBrief: графика получает generationPrompt, звук — audioReference', () => {
  const md = renderAssetBrief(manifest, 'Тест');
  assert.equal(md.includes('flat vector coin icon'), true);
  assert.equal(md.includes('Референс для звука:** короткий яркий'), true);
  assert.equal(md.includes('Референс для звука:** лёгкий бодрый чиптюн-луп'), true);
});

test('renderAssetBrief: группирует по типу и не падает на пустом манифесте', () => {
  const empty: AssetManifest = {
    styleGuide: { artStyle: 'минимализм', colorPalette: [], perspective: '' },
    assets: [],
  };
  const md = renderAssetBrief(empty, 'Пустая игра');
  assert.equal(md.includes('# Бриф ассетов — Пустая игра'), true);
  assert.equal(md.includes('Манифест пуст'), true);
});
