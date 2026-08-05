// src/tools/code-validator.ts
import * as ts from 'typescript';
import { GameCode } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

/**
 * Валидирует код через TypeScript Compiler API (без записи на диск).
 * Возвращает массив строк с ошибками.
 */
export async function validateCode(code: GameCode): Promise<string[]> {
  const errors: string[] = [];

  // Собираем все файлы в один виртуальный проект
  const fileMap: Map<string, string> = new Map();
  for (const file of code.files) {
    fileMap.set(file.path, file.content);
  }

  // Создаём компилятор
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    noEmit: true,
    allowJs: false,
    checkJs: false,
    // Явно не указываем `types: ['phaser']` — этот компилятор-опшн относится к
    // typeRoots-пакетам (@types/*), а Phaser поставляет собственный .d.ts и
    // резолвится штатно через `import Phaser from 'phaser'` + moduleResolution.
    // Достаточно, чтобы пакет 'phaser' был установлен (см. package.json devDependencies) —
    // тогда обычная резолюция модулей найдёт node_modules/phaser/types/phaser.d.ts.
  };

  // Создаём хост для виртуальной файловой системы.
  // Виртуальные файлы игры (fileMap) имеют приоритет; для всего остального —
  // lib.*.d.ts самого TypeScript, типы Phaser из node_modules и т.п. — падаем
  // обратно на реальную файловую систему через ts.sys. Раньше здесь были
  // no-op заглушки, из-за которых компилятор не видел ни одного lib-файла и
  // валил идеальный код ложными ошибками вида "Cannot find global type 'Array'".
  const host: ts.CompilerHost = {
    fileExists: (fileName) => fileMap.has(fileName) || ts.sys.fileExists(fileName),
    readFile: (fileName) => {
      if (fileMap.has(fileName)) return fileMap.get(fileName);
      return ts.sys.readFile(fileName);
    },
    getSourceFile: (fileName, languageVersion) => {
      const content = fileMap.has(fileName) ? fileMap.get(fileName) : ts.sys.readFile(fileName);
      if (content === undefined) return undefined;
      return ts.createSourceFile(fileName, content, languageVersion, true);
    },
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    writeFile: () => {},
    getCurrentDirectory: () => process.cwd(),
    getDirectories: (path) => (ts.sys.getDirectories ? ts.sys.getDirectories(path) : []),
    directoryExists: (path) => (ts.sys.directoryExists ? ts.sys.directoryExists(path) : true),
    realpath: (path) => (ts.sys.realpath ? ts.sys.realpath(path) : path),
    getCanonicalFileName: (fileName) => (ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase()),
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    getNewLine: () => '\n',
  };

  // Создаём программу
  const program = ts.createProgram({
    rootNames: Array.from(fileMap.keys()),
    options: compilerOptions,
    host,
  });

  // Получаем диагностику
  const diagnostics = ts.getPreEmitDiagnostics(program);

  // Форматируем ошибки
  for (const diagnostic of diagnostics) {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start || 0
      );
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      errors.push(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      );
    } else {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      errors.push(`Ошибка: ${message}`);
    }
  }

  // Также можно дополнительно проверить через tsc (как fallback), но это уже не нужно

  return errors;
}

/**
 * Старая версия (через exec tsc) – оставляем для совместимости, но не используем.
 */
export async function validateCodeLegacy(code: GameCode): Promise<string[]> {
  // ... старый код через exec, если нужен
  return [];
}