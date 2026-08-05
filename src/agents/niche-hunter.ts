// src/agents/niche-hunter.ts
import { BaseAgent } from './base-agent';
import { parseJsonWithRecovery } from '../tools/json-cleaner';
import { NicheIdeaListSchema, validateDto } from '../schemas';
import { PipelineContext, NicheIdea, MarketData } from '../types';

export class NicheHunter extends BaseAgent {
  async run(context: PipelineContext): Promise<PipelineContext> {
    console.log('🎯 Поиск перспективных ниш...');

    if (!context.market) {
      throw new Error('Рыночные данные не загружены. Сначала выполните MarketAnalyst.');
    }

    try {
      const niches = await this.findNiches(context.market, context);
      context.niches = niches;
      this.updateContext(context, 'Niche hunting completed');
      console.log(`✅ Найдено ${niches.length} ниш`);
      return context;
    } catch (error) {
      console.error('❌ Ошибка в NicheHunter:', error);
      context.errors.push(`NicheHunter: ${error}`);
      throw error;
    }
  }

  private async findNiches(marketData: MarketData, context: PipelineContext): Promise<NicheIdea[]> {
    const prompt = `
      Ты — эксперт по поиску игровых ниш. На основе данных о рынке найди 5-7 перспективных ниш для казуальных/мидкорных игр.

      Данные о рынке:
      ${JSON.stringify(marketData, null, 2)}

      Платформенные ограничения (ОБЯЗАТЕЛЬНО учитывай при подборе ниш и
      potentialMechanics — ниша, которую физически нельзя реализовать на
      платформе, бесполезна, даже если она "голубой океан"):
      - Это HTML5-игра, встроенная в браузерный iframe Яндекс Игр. Никакого
        нативного клиента, никакого доступа к произвольным устройствам/ОС.
      - Основной сценарий — ПК, мышь и клавиатура (touch — вторичная адаптация).
      - Единственный доступный SDK платформы — Yandex Games SDK (реклама,
        покупки, лидерборды, облачные сохранения, шаринг). Никаких сторонних
        SDK и интеграций с внешними сервисами.
      - НЕЛЬЗЯ закладывать в механику: голосовой чат/войсчаты (WebRTC и
        аналоги), доступ к камере/микрофону, интеграции с Discord/Telegram/
        соцсетями как игровую механику, крипто-платежи и любые платежи в
        обход Yandex Games SDK (USSD, крипта, сторонние кошельки),
        полноценный real-time мультиплеер с серверной инфраструктурой
        (сессии одиночные/асинхронные, если не указано иное), push-уведомления,
        офлайн-установку или доступ к файловой системе пользователя.

      Критерии поиска (метод «голубого океана»):
      1. Зарождение — 1-2 игры в нише (не перенасыщена).
      2. Нет волны клонов (CPI ещё не вырос).
      3. Есть потенциал для монетизационного сдвига (можно добавить IAP).

      Для каждой ниши укажи:
      - name: название
      - description: описание
      - whyBlueOcean: почему это "голубой океан"
      - existingGames: примеры существующих игр (массив строк)
      - potentialMechanics: потенциальная механика
      - complexity: оценка сложности реализации (1-10)
      - monetizationPotential: потенциал монетизации (1-10)

      Перед ответом проверь каждую нишу на платформенные ограничения выше —
      если potentialMechanics нарушает хотя бы одно из них, перепиши механику
      так, чтобы она реализовывалась средствами Yandex Games SDK и Phaser 3
      в браузере, не меняя сути "голубого океана" ниши.

      Верни строго JSON-массив объектов.
    `;

    const systemPrompt = 'Ты — эксперт по поиску игровых ниш. Отвечай только валидным JSON.';

    // === ИСПОЛЬЗУЕМ ЦЕНТРАЛИЗОВАННЫЙ РЕТРАЙ ===
    const response = await this.callWithRetry(
      async () => {
        return await this.openRouter.chat(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          {
            task: 'simple',
            temperature: 0.5,
            useCache: true,
            maxTokens: 8192,
          }
        );
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        retryableErrors: ['429', '500', '502', '503', '504'],
      }
    );

    console.log('📝 Сырой ответ модели (первые 200 символов):', response.content.substring(0, 200) + '...');

    // P1-7: реальный учёт токенов вместо всегда-0 context.tokenUsage
    if (response.usage) {
      context.tokenUsage = (context.tokenUsage || 0) + response.usage.totalTokens;
    }

    // === ПАРСИНГ С ФОЛБЭКАМИ (единая функция вместо самописного псевдо-retry) ===
    try {
      const raw = parseJsonWithRecovery<unknown>(response.content);
      const result = validateDto(NicheIdeaListSchema, raw, 'NicheIdea[]');
      console.log('✅ Парсинг JSON успешен');
      return result;
    } catch (parseError: any) {
      console.error('❌ Ошибка парсинга JSON:', parseError.message);
      throw new Error(`Не удалось распарсить ответ модели: ${parseError.message}`);
    }
  }
}