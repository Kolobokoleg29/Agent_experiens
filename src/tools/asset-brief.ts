// src/tools/asset-brief.ts
//
// Рендерит AssetManifest (см. AssetAgent/AssetManifestSchema) в читаемый
// человеком ASSET_BRIEF.md — это и есть тот самый "список промптов и путей",
// который художник/звукорежиссёр открывает и генерирует ассеты по нему, а
// потом кладёт файлы строго по указанным путям (которые уже совпадают с
// this.load.*(...) в коде, см. tools/prompt-builder.ts::buildCodePrompt).
import { AssetEntry, AssetManifest } from '../types';

const TYPE_LABELS: Record<AssetEntry['type'], string> = {
  sprite: '🖼️ Спрайты',
  spritesheet: '🎞️ Спрайт-листы (анимации)',
  ui: '🔘 UI-элементы',
  sfx: '🔊 Звуковые эффекты',
  music: '🎵 Музыка',
};

const TYPE_ORDER: AssetEntry['type'][] = ['sprite', 'spritesheet', 'ui', 'sfx', 'music'];

function renderEntry(asset: AssetEntry): string {
  const lines = [`### \`${asset.id}\``, '', `- **Путь:** \`${asset.path}\``, `- **Формат:** ${asset.format}`];

  switch (asset.type) {
    case 'sprite':
    case 'ui':
      lines.push(`- **Размер:** ${asset.width}×${asset.height}px`);
      break;
    case 'spritesheet':
      lines.push(
        `- **Кадр:** ${asset.frameWidth}×${asset.frameHeight}px`,
        `- **Кадров:** ${asset.frameCount}`
      );
      break;
    case 'sfx':
    case 'music':
      break;
  }

  lines.push(`- **Описание:** ${asset.description}`);

  if (asset.type === 'sprite' || asset.type === 'spritesheet' || asset.type === 'ui') {
    lines.push('', '**Промпт для генерации (Midjourney / SD / DALL-E):**', '', '```', asset.generationPrompt, '```');
  } else {
    lines.push('', `**Референс для звука:** ${asset.audioReference}`);
  }

  return lines.join('\n');
}

/**
 * @param manifest манифест ассетов (AssetAgent).
 * @param title название игры — для заголовка документа.
 */
export function renderAssetBrief(manifest: AssetManifest, title: string): string {
  const { styleGuide, assets } = manifest;

  const header = [
    `# Бриф ассетов — ${title}`,
    '',
    'Этот файл сгенерирован автоматически (AssetAgent). Пути и ключи (id) ниже',
    'СОВПАДАЮТ 1-в-1 с `this.load.image/spritesheet/audio(...)` в коде игры —',
    'сгенерированные файлы достаточно положить строго по указанным путям, без',
    'правки кода.',
    '',
    '## Единый стиль (используй в каждом промпте генерации)',
    '',
    `- **Стиль:** ${styleGuide.artStyle}`,
    `- **Палитра:** ${styleGuide.colorPalette.length > 0 ? styleGuide.colorPalette.join(', ') : '(не указана)'}`,
    `- **Ракурс/перспектива:** ${styleGuide.perspective || '(не указан)'}`,
    '',
  ];

  const byType = new Map<AssetEntry['type'], AssetEntry[]>();
  for (const asset of assets) {
    const list = byType.get(asset.type) || [];
    list.push(asset);
    byType.set(asset.type, list);
  }

  const sections: string[] = [];
  for (const type of TYPE_ORDER) {
    const list = byType.get(type);
    if (!list || list.length === 0) continue;
    sections.push(`## ${TYPE_LABELS[type]} (${list.length})`, '');
    for (const asset of list) {
      sections.push(renderEntry(asset), '');
    }
  }

  if (assets.length === 0) {
    sections.push('_Манифест пуст — ассетов не потребовалось или AssetAgent не был запущен._', '');
  }

  return [...header, ...sections].join('\n');
}
