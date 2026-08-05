// tests/code-validator.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCode } from '../src/tools/code-validator';
import { GameCode } from '../src/types';

test('validateCode: корректный код не даёт ложных ошибок', async () => {
  const code: GameCode = {
    files: [
      {
        path: 'index.ts',
        content: `
class Greeter {
  private items: Array<string> = [];
  add(item: string): void {
    this.items.push(item);
    console.log(\`Добавлено: \${item}\`);
  }
}
const g = new Greeter();
g.add('hello');
`,
      },
    ],
  };
  const errors = await validateCode(code);
  assert.deepEqual(errors, []);
});

test('validateCode: находит ровно ожидаемую ошибку типа', async () => {
  const code: GameCode = {
    files: [{ path: 'index.ts', content: 'const x: number = "str";\n' }],
  };
  const errors = await validateCode(code);
  assert.equal(errors.length > 0, true);
  assert.equal(errors.some(e => e.includes('not assignable')), true);
});

test('validateCode: import Phaser from "phaser" резолвится без ошибок', async () => {
  const code: GameCode = {
    files: [
      {
        path: 'BootScene.ts',
        content: `
import Phaser from 'phaser';
export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }
  preload(): void {}
  create(): void {}
}
`,
      },
    ],
  };
  const errors = await validateCode(code);
  assert.deepEqual(errors, []);
});
