// src/tools/code-validator.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import { GameCode } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export async function validateCode(code: GameCode): Promise<string[]> {
  // Создаём временную папку
  const tempDir = await fs.mkdtemp(path.join(tmpdir(), 'phaser-review-'));
  try {
    // Записываем все файлы из code.files во временную папку
    for (const file of code.files) {
      const fullPath = path.join(tempDir, file.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, file.content);
    }

    // Запускаем tsc --noEmit
    try {
      await execAsync('npx tsc --noEmit', { cwd: tempDir });
      return []; // ошибок нет
    } catch (error: any) {
      // Извлекаем сообщения об ошибках из stdout/stderr
      const output = error.stdout + error.stderr;
      const lines = output.split('\n').filter(line => line.includes('error TS'));
      return lines;
    }
  } finally {
    // Удаляем временную папку (опционально)
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}