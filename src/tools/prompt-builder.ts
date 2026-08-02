// src/tools/prompt-builder.ts
import { GameConcept, GameDesign } from '../types';

export function buildConceptPrompt(userPrompt: string, searchResults: string): string {
  return `
Пользователь хочет создать 2D-игру: "${userPrompt}"

Вот информация из интернета о похожих играх (если есть):
${searchResults || 'Нет данных'}

Создай концепцию 2D-игры для платформы Яндекс Игры (мобильная адаптация, монетизация через рекламу/покупки).
Обязательно: игра должна быть строго 2D (не 3D, не псевдо-3D).
Используй формат JSON с полями: title, genre, description, mechanics (массив), targetAudience, monetization (объект), platforms.

Пример ответа:
{
  "title": "Космический бегун",
  "genre": "runner",
  "description": "...",
  "mechanics": ["прыжок", "уклонение"],
  "targetAudience": "казуальные игроки",
  "monetization": { "ads": true, "inAppPurchases": false },
  "platforms": ["web", "yandex-games"]
}
`;
}

export function buildDesignPrompt(concept: GameConcept, docs: string): string {
  return `
Концепция 2D-игры: ${JSON.stringify(concept, null, 2)}

Документация/примеры: ${docs || 'нет'}

Разработай детальный дизайн для 2D-игры на Phaser 3 (TypeScript). Учти, что игра должна быть строго 2D, использовать спрайты и 2D-физику.
Верни JSON с полями:
- scenes: массив объектов { name, description, objects: [{ type, name, properties }] }
- physics: описание физики (например, "arcade")
- uiLayout: описание интерфейса
- assets: список необходимых ассетов (звуки, спрайты)
- codeStructure: описание классов и файлов
`;
}

export function buildCodePrompt(design: GameDesign, snippets: string): string {
  return `
Дизайн 2D-игры: ${JSON.stringify(design, null, 2)}

Примеры сниппетов (если есть): ${snippets || 'нет'}

Сгенерируй полный код 2D-игры на Phaser 3 + TypeScript. Убедись, что используются только 2D-механики (спрайты, 2D-физика). Верни JSON с полем files: массив { path, content }.
`;
}