// tests/project-writer.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  slugify,
  sanitizeRelativePath,
  detectEntryFile,
  writeProjectToDisk,
} from '../src/tools/project-writer';
import { GameCode, AssetManifest } from '../src/types';

test('slugify: транслитерирует кириллицу и убирает лишние символы', () => {
  assert.equal(slugify('Экспедиция Ребусов'), 'ekspediciya-rebusov');
  assert.equal(slugify('  My Game!! 2  '), 'my-game-2');
});

test('slugify: пустое/undefined название даёт непустой фолбэк', () => {
  assert.equal(slugify(undefined).startsWith('yandex-game-'), true);
  assert.equal(slugify('   ').startsWith('yandex-game-'), true);
});

test('sanitizeRelativePath: обычный относительный путь проходит как есть', () => {
  const root = '/tmp/some-project';
  assert.equal(sanitizeRelativePath('src/scenes/BootScene.ts', root), 'src/scenes/BootScene.ts');
  assert.equal(sanitizeRelativePath('./BootScene.ts', root), 'BootScene.ts');
});

test('sanitizeRelativePath: отклоняет path traversal за пределы проекта', () => {
  const root = '/tmp/some-project';
  assert.equal(sanitizeRelativePath('../../etc/passwd', root), null);
  assert.equal(sanitizeRelativePath('../secrets.env', root), null);
});

test('sanitizeRelativePath: отклоняет абсолютные пути', () => {
  const root = '/tmp/some-project';
  assert.equal(sanitizeRelativePath('/etc/passwd', root), null);
  assert.equal(sanitizeRelativePath('C:/Windows/system32/x.ts', root), null);
});

test('sanitizeRelativePath: отклоняет пустой/некорректный путь', () => {
  const root = '/tmp/some-project';
  assert.equal(sanitizeRelativePath('', root), null);
  assert.equal(sanitizeRelativePath('.', root), null);
});

test('detectEntryFile: находит файл с new Phaser.Game(...)', () => {
  const files = [
    { path: 'src/scenes/BootScene.ts', content: 'export class BootScene {}' },
    { path: 'src/main.ts', content: "new Phaser.Game({ scene: [] });" },
  ];
  assert.equal(detectEntryFile(files), 'src/main.ts');
});

test('detectEntryFile: возвращает null, если entry point не найден', () => {
  const files = [{ path: 'src/scenes/BootScene.ts', content: 'export class BootScene {}' }];
  assert.equal(detectEntryFile(files), null);
});

test('writeProjectToDisk: пишет файлы кода + boilerplate, пропускает опасные пути', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-tools-test-'));
  try {
    const code: GameCode = {
      files: [
        { path: 'src/main.ts', content: "new Phaser.Game({ scene: [] });" },
        { path: 'src/scenes/BootScene.ts', content: 'export class BootScene {}' },
        { path: '../../outside.ts', content: 'должно быть пропущено' },
      ],
    };

    const result = await writeProjectToDisk(code, {
      outputRoot: tmpRoot,
      slug: 'test-game',
      title: 'Тестовая игра',
    });

    assert.equal(result.projectDir, path.join(tmpRoot, 'test-game'));
    assert.equal(result.entryFile, 'src/main.ts');
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].path, '../../outside.ts');

    // Код реально записан на диск
    const mainContent = await fs.readFile(path.join(result.projectDir, 'src/main.ts'), 'utf-8');
    assert.equal(mainContent.includes('Phaser.Game'), true);

    // Boilerplate тоже записан
    const pkg = JSON.parse(await fs.readFile(path.join(result.projectDir, 'package.json'), 'utf-8'));
    assert.equal(pkg.name, 'test-game');
    assert.equal(pkg.dependencies.phaser, '^3.90.0');

    const indexHtml = await fs.readFile(path.join(result.projectDir, 'index.html'), 'utf-8');
    assert.equal(indexHtml.includes('/src/main.ts'), true);
    assert.equal(indexHtml.includes('yandex.ru/games/sdk'), true);

    // Файл вне projectDir НЕ появился (проверяем, что traversal реально не сработал)
    const escapedPath = path.resolve(tmpRoot, '..', 'outside.ts');
    await assert.rejects(fs.access(escapedPath));
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
});

test('writeProjectToDisk: без assetManifest ASSET_BRIEF.md не создаётся', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-tools-test-'));
  try {
    const code: GameCode = { files: [{ path: 'src/main.ts', content: 'new Phaser.Game({});' }] };
    const result = await writeProjectToDisk(code, { outputRoot: tmpRoot, slug: 'no-assets', title: 'Без ассетов' });

    assert.equal(result.assetBriefWritten, false);
    assert.equal(result.filesWritten.includes('ASSET_BRIEF.md'), false);
    await assert.rejects(fs.access(path.join(result.projectDir, 'ASSET_BRIEF.md')));
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
});

test('writeProjectToDisk: с assetManifest пишет ASSET_BRIEF.md рядом с package.json', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-tools-test-'));
  try {
    const code: GameCode = { files: [{ path: 'src/main.ts', content: 'new Phaser.Game({});' }] };
    const assetManifest: AssetManifest = {
      styleGuide: { artStyle: 'flat vector', colorPalette: ['#FFFFFF'], perspective: 'top-down' },
      assets: [
        {
          id: 'coin',
          path: 'assets/sprites/coin.png',
          type: 'sprite',
          description: 'Монета',
          format: 'png',
          width: 32,
          height: 32,
          generationPrompt: 'flat vector gold coin icon, top-down, transparent background',
        },
      ],
    };

    const result = await writeProjectToDisk(code, {
      outputRoot: tmpRoot,
      slug: 'with-assets',
      title: 'С ассетами',
      assetManifest,
    });

    assert.equal(result.assetBriefWritten, true);
    assert.equal(result.filesWritten.includes('ASSET_BRIEF.md'), true);

    // Лежит РЯДОМ с package.json, то есть в корне спроецированного проекта
    const briefPath = path.join(result.projectDir, 'ASSET_BRIEF.md');
    const pkgPath = path.join(result.projectDir, 'package.json');
    await fs.access(briefPath);
    await fs.access(pkgPath);

    const brief = await fs.readFile(briefPath, 'utf-8');
    assert.equal(brief.includes('assets/sprites/coin.png'), true);
    assert.equal(brief.includes('flat vector gold coin icon'), true);
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
});
