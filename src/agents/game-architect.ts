// src/agents/game-architect.ts
import { BaseAgent } from './base-agent';
import { cleanJson } from '../tools/json-cleaner';
import { GameConcept, GameDesignDocument } from '../types';

export class GameArchitect extends BaseAgent {
  async design(concept: GameConcept): Promise<GameDesignDocument> {
    console.log('📐 Создание детального Game Design Document для 2D-игры...');
    
    const prompt = `
      Разработай детальный Game Design Document для 2D-игры:
      
      Концепция: ${JSON.stringify(concept, null, 2)}
      
      Включи следующие разделы:
      
      1. **Концепция и уникальность**
         - Что делает игру особенной (в 2D-пространстве)
         - Ключевое отличие от конкурентов
      
      2. **Целевая аудитория**
         - Портрет игрока
         - Мотивация играть
         - Болевые точки
      
      3. **Игровой цикл (Core Loop)**
         - Что делает игрок каждую секунду
         - Что делает игрок каждую минуту
         - Что делает игрок каждую сессию
         - Прогрессия
      
      4. **Монетизация**
         - Какие форматы рекламы (fullscreen, rewarded, banner)
         - Какие внутриигровые покупки
         - Баланс F2P и платных механик
         - Экономика игры
      
      5. **Техническая архитектура на Phaser 3 (2D)**
         - Сцены (Boot, Menu, Game, UI, Result)
         - Ключевые сущности и их свойства (спрайты, тайлы)
         - 2D-физика (Arcade Physics)
         - Анимации спрайтов
         - Система сохранений через Yandex SDK
      
      6. **Требования к модерации** (на основе правил Яндекс Игр)
         - SDK встроен
         - Нет внешней регистрации
         - Платежи только через SDK
         - Автопауза при сворачивании
         - Полноэкранный режим на мобильных
      
      7. **MVP-фичи (на 1-2 недели разработки)**
      
      8. **Риски и их mitigation**
      
      Верни строго JSON с полями: concept, uniqueness, targetAudience, coreLoop, monetization, technicalArchitecture, moderationRequirements, mvpFeatures, risks.
    `;

    const response = await this.openRouter.chat(
      [
        { role: 'system', content: 'Ты — ведущий гейм-архитектор с 10+ лет опыта, специализирующийся на 2D-играх. Отвечай только валидным JSON.' },
        { role: 'user', content: prompt },
      ],
      {
        task: 'reasoning',
        temperature: 0.7,
        useCache: true,
        maxTokens: 24000,
      }
    );

    console.log('📝 Сырой ответ модели (первые 200 символов):', response.content.substring(0, 200) + '...');

    try {
      const cleaned = cleanJson(response.content);
      console.log('🧹 Очищенный JSON (первые 200 символов):', cleaned.substring(0, 200) + '...');
      const gdd = JSON.parse(cleaned) as GameDesignDocument;
      console.log('✅ Парсинг JSON успешен');
      return gdd;
    } catch (parseError) {
      console.error('❌ Ошибка парсинга JSON. Полный сырой ответ:', response.content);
      throw parseError;
    }
  }
}