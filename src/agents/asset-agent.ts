// src/agents/asset-agent.ts
import { BaseAgent } from './base-agent';
import { parseJsonWithRecovery } from '../tools/json-cleaner';
import { AssetManifestSchema, validateDto } from '../schemas';
import { PipelineContext, GameDesignDocument, Economy, Production, AssetManifest } from '../types';

/**
 * ProductionAgent считает СКОЛЬКО ассетов нужно (context.production.art/.audio —
 * числа), но не какие именно и не куда их класть. AssetAgent — новый этап
 * между Production и Code: превращает эти числа в конкретный манифест —
 * для каждого ассета путь в проекте, тип, размеры/формат и готовый промпт
 * для генерации в Midjourney/SD/DALL-E (для графики) или текстовое
 * описание/референс (для звука).
 *
 * Манифест затем ОБЯЗАТЕЛЬНО скармливается в buildCodePrompt (см.
 * tools/prompt-builder.ts), чтобы this.load.image/spritesheet/audio(...) в
 * сгенерированном коде совпадали с путями манифеста 1-в-1 — иначе игра
 * физически не соберётся, пока кто-то руками не разложит картинки по
 * угаданным путям.
 */
export class AssetAgent extends BaseAgent {
  async run(context: PipelineContext): Promise<PipelineContext> {
    console.log('🎨 Генерация манифеста ассетов...');

    if (!context.gdd) {
      throw new Error('GDD не сгенерирован. Сначала выполните GameArchitect.');
    }
    if (!context.production) {
      throw new Error('Оценка продакшна не выполнена. Сначала выполните ProductionAgent.');
    }

    try {
      const manifest = await this.build(context.gdd, context.economy, context.production, context);
      context.assets = manifest;
      this.checkManifestSanity(manifest, context);
      this.updateContext(context, 'Asset manifest generation completed');
      console.log(`✅ Манифест ассетов готов (${manifest.assets.length} записей)`);
      return context;
    } catch (error) {
      console.error('❌ Ошибка в AssetAgent:', error);
      context.errors.push(`AssetAgent: ${error}`);
      throw error;
    }
  }

  private async build(
    gdd: GameDesignDocument,
    economy: Economy | undefined,
    production: Production,
    context: PipelineContext
  ): Promise<AssetManifest> {
    const economySection = economy
      ? `
Экономика/баланс (используй, чтобы понять, сколько РАЗНЫХ визуально врагов/
предметов реально нужно — например, число записей в enemyBalance подсказывает
число разных вражеских спрайтов, а не то, что каждая запись обязана иметь
отдельный арт, если враги переиспользуют внешний вид с разным балансом):
${JSON.stringify(economy, null, 2)}
`
      : '';

    const prompt = `Ты — арт-директор инди-разработки, готовящий техническое задание на арт и звук для 2D-игры на Phaser 3.

Задание: на основе GDD и оценки продакшна составить манифест ассетов — точный
список того, что нужно нарисовать/озвучить, с путями в проекте и готовыми
промптами для генерации.

GDD:
${JSON.stringify(gdd, null, 2)}
${economySection}
Оценка объёма продакшна (ориентируйся на эти числа как на целевое количество
записей манифеста по каждой категории — не обязательно совпадать день-в-день,
но порядок величины должен соответствовать):
- Графика: ${production.art.sprites} спрайтов, ${production.art.animations} анимаций
  (= спрайт-листов), ${production.art.uiScreens} экранов UI, ${production.art.vfx} визуальных эффектов.
- Звук: ${production.audio.musicTracks} музыкальных треков, ${production.audio.soundEffects} звуковых эффектов.

Верни строго JSON со следующей структурой:

{
  "styleGuide": {
    "artStyle": "общий визуальный стиль игры (напр. 'flat vector, мультяшный, толстый чёрный контур')",
    "colorPalette": ["#HEX", "..."],
    "perspective": "ракурс/перспектива по умолчанию, напр. 'top-down' или 'side-view 2D platformer'"
  },
  "assets": [ ... ]
}

Каждый элемент "assets" — ОДИН объект СТРОГО одного из следующих видов (поле
"type" определяет, какие ещё поля обязательны):

1. Обычный спрайт (один статичный кадр — иконки предметов, статичные объекты):
   { "id": "короткий_ключ", "path": "assets/sprites/<имя>.png", "type": "sprite",
     "description": "что это и где используется", "format": "png" | "webp",
     "width": число_px, "height": число_px,
     "generationPrompt": "готовый промпт для Midjourney/SD/DALL-E: стиль (используй styleGuide.artStyle),
       палитра (используй styleGuide.colorPalette), ракурс, что именно изображено, фон прозрачный" }

2. Спрайт-лист (анимация — персонаж/враг с несколькими кадрами):
   { "id": "...", "path": "assets/spritesheets/<имя>.png", "type": "spritesheet",
     "description": "...", "format": "png" | "webp",
     "frameWidth": число_px, "frameHeight": число_px, "frameCount": число_кадров,
     "generationPrompt": "..." }

3. UI-элемент (кнопки, панели, иконки интерфейса, экраны):
   { "id": "...", "path": "assets/ui/<имя>.png", "type": "ui",
     "description": "...", "format": "png" | "webp",
     "width": число_px, "height": число_px, "generationPrompt": "..." }

4. Звуковой эффект:
   { "id": "...", "path": "assets/sfx/<имя>.mp3", "type": "sfx",
     "description": "...", "format": "mp3" | "ogg",
     "audioReference": "текстовое описание/референс: что за звук, настроение, примерная длительность, на что похоже" }

5. Музыкальный трек:
   { "id": "...", "path": "assets/music/<имя>.mp3", "type": "music",
     "description": "...", "format": "mp3" | "ogg",
     "audioReference": "текстовое описание/референс: жанр, темп, настроение, примерная длительность" }

ВАЖНО:
- "id" — короткий стабильный идентификатор в snake_case (напр. "player_idle",
  "coin_pickup") — он же будет использован как key в this.load.*(id, path) в
  коде, поэтому НЕ должен содержать пробелов/спецсимволов.
- "path" ВСЕГДА начинается с "assets/" и лежит в подпапке, соответствующей
  типу (sprites/spritesheets/ui/sfx/music), расширение файла должно совпадать
  с "format".
- Каждый generationPrompt должен быть самодостаточным (человек копирует его
  как есть в Midjourney/SD/DALL-E) и явно ссылаться на styleGuide, чтобы весь
  арт был визуально консистентен между собой.
- Не дублируй ассеты: если один и тот же спрайт переиспользуется в нескольких
  местах (например, один и тот же тип монеты), это ОДНА запись в манифесте.`;

    const response = await this.callWithRetry(
      async () => {
        return await this.openRouter.chat(
          [
            {
              role: 'system',
              content:
                'Ты — арт-директор инди-разработки. Отвечай только валидным JSON строго по описанной схеме, без пояснений вне JSON.',
            },
            { role: 'user', content: prompt },
          ],
          {
            task: 'reasoning',
            temperature: 0.6,
            useCache: true,
            maxTokens: 32768,
          }
        );
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        retryableErrors: ['429', '500', '502', '503', '504'],
      }
    );

    if (!response?.content) {
      throw new Error('Модель вернула пустой ответ');
    }

    console.log('📝 Сырой ответ модели (первые 200 символов):', response.content.substring(0, 200) + '...');

    if (response.usage) {
      context.tokenUsage = (context.tokenUsage || 0) + response.usage.totalTokens;
    }

    try {
      const raw = parseJsonWithRecovery<unknown>(response.content);
      const manifest = validateDto(AssetManifestSchema, raw, 'AssetManifest');
      console.log('✅ Парсинг JSON успешен');
      return manifest;
    } catch (parseError: any) {
      console.error('❌ Ошибка парсинга JSON. Полный сырой ответ (первые 1000 символов):', response.content.substring(0, 1000));
      throw new Error(`Не удалось распарсить ответ модели: ${parseError.message}`);
    }
  }

  /**
   * Дешёвая детерминированная проверка (без LLM), тот же принцип, что
   * EconomyAgent.checkDropTableSanity: Zod-схема валидирует КАЖДУЮ запись по
   * отдельности, но не видит манифест целиком. Дубли id/path и рассинхрон
   * между path и type/format физически ломают this.load.*(...) в коде, даже
   * если каждая отдельная запись формально прошла схему.
   */
  private checkManifestSanity(manifest: AssetManifest, context: PipelineContext): void {
    const seenIds = new Set<string>();
    const seenPaths = new Set<string>();
    const expectedDir: Record<string, string> = {
      sprite: 'assets/sprites/',
      spritesheet: 'assets/spritesheets/',
      ui: 'assets/ui/',
      sfx: 'assets/sfx/',
      music: 'assets/music/',
    };

    for (const asset of manifest.assets) {
      if (seenIds.has(asset.id)) {
        context.warnings.push(`AssetAgent: дублирующийся id ассета "${asset.id}" — this.load.*(id, ...) в коде перезапишет один из них`);
      }
      seenIds.add(asset.id);

      if (seenPaths.has(asset.path)) {
        context.warnings.push(`AssetAgent: дублирующийся путь ассета "${asset.path}"`);
      }
      seenPaths.add(asset.path);

      const dir = expectedDir[asset.type];
      if (dir && !asset.path.startsWith(dir)) {
        context.warnings.push(
          `AssetAgent: путь "${asset.path}" (тип ${asset.type}) ожидался в подпапке "${dir}" — проверь, что путь в манифесте совпадёт с this.load.*(...) в коде`
        );
      }

      if (!asset.path.toLowerCase().endsWith(`.${asset.format}`)) {
        context.warnings.push(`AssetAgent: расширение файла в пути "${asset.path}" не совпадает с указанным format "${asset.format}"`);
      }
    }
  }
}
