// src/tools/project-writer.ts
//
// Материализует context.code.files в реальное дерево файлов на диске
// (output/games/<slug>/...) вместо того, чтобы сгенерированный код оставался
// только сериализованным JSON внутри чекпоинта/output/6-code.json. Плюс
// генерирует минимальный статический Vite-boilerplate (package.json,
// tsconfig.json, vite.config.ts, index.html) — это шаблон, одинаковый для
// любой игры на этом стеке, поэтому он написан один раз здесь, а не заново
// генерируется LLM на каждый прогон пайплайна (экономия токенов, тот же
// принцип, что уже используется для детерминированной валидации кода
// в tools/code-validator.ts).
import * as fs from 'fs/promises';
import * as path from 'path';
import { GameCode, AssetManifest } from '../types';
import { renderAssetBrief } from './asset-brief';

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/**
 * Транслитерация + слагификация названия игры в безопасное имя папки/пакета.
 * "Экспедиция Ребусов 2" -> "ekspediciya-rebusov-2"
 */
export function slugify(title: string | undefined | null): string {
  const safe = (title || '').trim();
  if (!safe) return `yandex-game-${Date.now()}`;

  const translit = safe
    .toLowerCase()
    .split('')
    .map((ch) => (ch in CYRILLIC_TO_LATIN ? CYRILLIC_TO_LATIN[ch] : ch))
    .join('');

  const slug = translit
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return slug || `yandex-game-${Date.now()}`;
}

export interface SkippedFile {
  path: string;
  reason: string;
}

/**
 * Проверяет путь файла из GameCode (сгенерирован LLM — недоверенный ввод) и
 * приводит его к безопасному относительному пути внутри projectRoot. Защита
 * от path traversal ("../../../etc/passwd") и абсолютных путей: это
 * единственное место в пайплайне, где содержимое ответа модели реально
 * попадает на файловую систему, поэтому доверять полю path нельзя.
 *
 * Возвращает null, если путь недопустим — вызывающий код должен пропустить
 * такой файл, а не молча писать его туда, куда получится.
 */
export function sanitizeRelativePath(rawPath: string, projectRoot: string): string | null {
  if (!rawPath || typeof rawPath !== 'string') return null;

  const withForwardSlashes = rawPath.trim().replace(/\\/g, '/');
  if (!withForwardSlashes) return null;

  // Абсолютные пути (unix "/..." и Windows-диски вида "C:/...") отсекаем ДО
  // удаления ведущего слэша — иначе "/etc/passwd" молча превращается в
  // относительный "etc/passwd" и проходит проверку ниже.
  if (withForwardSlashes.startsWith('/') || /^[a-zA-Z]:/.test(withForwardSlashes)) return null;

  const normalized = withForwardSlashes.replace(/^\.\/+/, '');
  if (!normalized) return null;

  const resolvedRoot = path.resolve(projectRoot);
  const resolved = path.resolve(resolvedRoot, normalized);
  const rootWithSep = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep;
  if (!resolved.startsWith(rootWithSep)) return null; // ушёл за пределы projectRoot через ".."

  return path.relative(resolvedRoot, resolved).replace(/\\/g, '/');
}

/**
 * Ищет файл, в котором реально создаётся `new Phaser.Game(...)` — это entry
 * point, на который должен ссылаться index.html. buildCodePrompt (см.
 * tools/prompt-builder.ts) сейчас явно не требует конкретное имя/путь для
 * этого файла, поэтому его нужно определять по содержимому, а не угадывать
 * по имени файла.
 */
export function detectEntryFile(files: { path: string; content: string }[]): string | null {
  const candidates = files.filter((f) => /new\s+Phaser\.Game\s*\(/.test(f.content));
  if (candidates.length === 0) return null;
  // Если несколько — берём файл с самым коротким путём (обычно это и есть
  // корневой main/index файл, а не сцена, которая просто ссылается на конфиг).
  candidates.sort((a, b) => a.path.length - b.path.length);
  return candidates[0].path;
}

function toWebPath(relativePath: string): string {
  return '/' + relativePath.replace(/\\/g, '/');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Статический boilerplate Vite-проекта под Phaser 3 + Яндекс Игры. Намеренно
 * НЕ идёт через LLM — одинаковый шаблон для любой игры на этом стеке.
 */
export function generateBoilerplate(opts: {
  slug: string;
  title: string;
  entryWebPath: string;
  entryDetected: boolean;
}): { path: string; content: string }[] {
  const { slug, title, entryWebPath, entryDetected } = opts;

  const packageJson = {
    name: slug,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      phaser: '^3.90.0',
    },
    devDependencies: {
      typescript: '^5.9.3',
      vite: '^5.4.0',
    },
  };

  const tsconfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      noEmit: true,
    },
    include: ['src', '*.ts'],
  };

  const viteConfig = `import { defineConfig } from 'vite';

// Сгенерировано автоматически (ProjectWriterStage). base: './' — Яндекс Игры
// раздают игру не с корня домена, относительные пути обязательны.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
`;

  const indexHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>${escapeHtml(title)}</title>
  <style>
    html, body { margin: 0; padding: 0; background: #000; overflow: hidden; }
    #game { width: 100vw; height: 100vh; }
  </style>
  <!-- Yandex Games SDK -->
  <script src="https://yandex.ru/games/sdk/v2"></script>
</head>
<body>
  <div id="game"></div>
  <!-- ${entryDetected ? 'Entry point найден автоматически (файл с new Phaser.Game(...))' : 'ВНИМАНИЕ: entry point не найден среди сгенерированных файлов, путь ниже — заглушка по умолчанию, проверьте вручную'} -->
  <script type="module" src="${entryWebPath}"></script>
</body>
</html>
`;

  const gitignore = `node_modules/\ndist/\n.env\n`;

  const assetsReadme = `Папка для спрайтов/звуков игры "${title}".

Эта папка намеренно пустая — сама генерация арта/звука (Midjourney/SD/DALL-E
и т.п.) в пайплайн не входит. Полный список ожидаемых кодом ассетов (пути,
размеры, формат) и готовые промпты для генерации — см. ASSET_BRIEF.md в
корне проекта. Пути там совпадают 1-в-1 с this.load.*(...) в коде, поэтому
сгенерированные файлы достаточно положить строго по указанным путям.
`;

  return [
    { path: 'package.json', content: JSON.stringify(packageJson, null, 2) + '\n' },
    { path: 'tsconfig.json', content: JSON.stringify(tsconfig, null, 2) + '\n' },
    { path: 'vite.config.ts', content: viteConfig },
    { path: 'index.html', content: indexHtml },
    { path: '.gitignore', content: gitignore },
    { path: 'assets/README.md', content: assetsReadme },
  ];
}

export interface WriteProjectResult {
  projectDir: string;
  filesWritten: string[];
  skipped: SkippedFile[];
  entryFile: string | null;
  assetBriefWritten: boolean;
}

/**
 * Пишет GameCode.files на диск как реальный проект, плюс статический
 * boilerplate. Это единственное место в пайплайне, где сгенерированный код
 * перестаёт быть JSON внутри чекпоинта и становится файлами, которые можно
 * открыть в редакторе или собрать через `npm run build`.
 *
 * Если передан assetManifest (AssetAgent) — рядом с проектом (в его корне,
 * на одном уровне с package.json) дополнительно пишется ASSET_BRIEF.md:
 * читаемый человеком список путей/промптов для генерации ассетов (манифест
 * и так сохраняется целиком в чекпоинте вместе со всем context, но
 * чекпоинт — это внутренний формат пайплайна, а не то, что открывают руками).
 */
export async function writeProjectToDisk(
  code: GameCode,
  opts: { outputRoot: string; slug: string; title: string; assetManifest?: AssetManifest }
): Promise<WriteProjectResult> {
  const projectDir = path.resolve(opts.outputRoot, opts.slug);
  await fs.mkdir(projectDir, { recursive: true });

  const filesWritten: string[] = [];
  const skipped: SkippedFile[] = [];
  const writtenForDetection: { path: string; content: string }[] = [];

  for (const file of code.files) {
    const safeRelPath = sanitizeRelativePath(file.path, projectDir);
    if (safeRelPath === null) {
      skipped.push({
        path: file.path,
        reason: 'небезопасный путь (абсолютный, пустой или выходит за пределы проекта через "..")',
      });
      continue;
    }
    const fullPath = path.join(projectDir, safeRelPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.content, 'utf-8');
    filesWritten.push(safeRelPath);
    writtenForDetection.push({ path: safeRelPath, content: file.content });
  }

  const entryFile = detectEntryFile(writtenForDetection);
  const entryDetected = entryFile !== null;
  const entryWebPath = entryFile
    ? toWebPath(entryFile)
    : toWebPath(writtenForDetection[0]?.path || 'src/main.ts');

  const boilerplate = generateBoilerplate({
    slug: opts.slug,
    title: opts.title,
    entryWebPath,
    entryDetected,
  });
  for (const file of boilerplate) {
    const fullPath = path.join(projectDir, file.path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.content, 'utf-8');
    filesWritten.push(file.path);
  }

  let assetBriefWritten = false;
  if (opts.assetManifest && opts.assetManifest.assets.length > 0) {
    const briefContent = renderAssetBrief(opts.assetManifest, opts.title);
    const briefPath = path.join(projectDir, 'ASSET_BRIEF.md');
    await fs.writeFile(briefPath, briefContent, 'utf-8');
    filesWritten.push('ASSET_BRIEF.md');
    assetBriefWritten = true;
  }

  return { projectDir, filesWritten, skipped, entryFile, assetBriefWritten };
}
