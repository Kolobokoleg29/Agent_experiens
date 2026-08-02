// src/tools/json-cleaner.ts

/**
 * Извлекает и очищает JSON из сырого текста.
 * Поддерживает:
 * - Markdown-обёртки ```json ... ```
 * - Строки с одинарными кавычками (заменяет на двойные)
 * - Удаление комментариев (// и /* ... *)
 * - Извлечение первого найденного JSON-объекта или массива
 */
export function cleanJson(raw: string): string {
  // 1. Удаляем markdown-обёртки
  let cleaned = raw.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, (match, content) => content);
  
  // 2. Ищем первый JSON-объект или массив
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  // 3. Удаляем комментарии (однострочные и многострочные)
  cleaned = cleaned.replace(/\/\/.*?$/gm, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // 4. Заменяем одинарные кавычки на двойные (только для строковых значений)
  // Простой подход: заменяем ' на " только в строках, но проще сделать через JSON.parse с восстановлением
  // Попробуем сначала стандартный парсинг, если не получается — чиним кавычки
  try {
    JSON.parse(cleaned);
    return cleaned; // валидный JSON
  } catch {
    // Пробуем исправить: заменяем все одинарные кавычки на двойные
    // Но избегаем замены внутри уже существующих двойных кавычек
    // Используем регулярное выражение: заменить ' на " везде, кроме как внутри двойных кавычек
    let fixed = '';
    let inDoubleQuotes = false;
    for (const ch of cleaned) {
      if (ch === '"' && (cleaned[cleaned.indexOf(ch) - 1] !== '\\')) {
        inDoubleQuotes = !inDoubleQuotes;
        fixed += ch;
      } else if (ch === "'" && !inDoubleQuotes) {
        fixed += '"';
      } else {
        fixed += ch;
      }
    }
    // Удаляем завершающие запятые в объектах и массивах
    fixed = fixed.replace(/,\s*}/g, '}');
    fixed = fixed.replace(/,\s*]/g, ']');
    return fixed;
  }
}