// src/tools/json-cleaner.ts
import * as fs from 'fs';
import * as path from 'path';

/**
 * P3: Находит границы верхнеуровневого JSON-объекта/массива в тексте,
 * корректно считая глубину вложенности (а не жадным regex'ом "от первой
 * скобки до последней во всём тексте").
 *
 * Баг, который это чинит: старый regex `/(\{[\s\S]*\}|\[[\s\S]*\])/` брал
 * текст от первой `{`/`[` до ПОСЛЕДНЕЙ `}`/`]` во всём ответе. Если модель
 * выдала массив из нескольких объектов и ответ оборвался по лимиту токенов
 * посреди ВТОРОГО объекта — а первый объект уже успел закрыться своей `}` —
 * то "последней" скобкой в тексте оказывалась именно та, что закрывала
 * первый объект, и всё содержимое второго объекта отбрасывалось целиком
 * ещё до того, как до дела доходили уровни восстановления обрыва.
 *
 * Если верхнеуровневая структура не закрывается до конца текста (реальный
 * обрыв по maxTokens), возвращаем весь текст от старта и до конца как есть —
 * дозакрытием и починкой кавычек займутся дальнейшие уровни восстановления.
 */
export function extractJsonBlock(text: string): string | null {
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' || text[i] === '[') {
      start = i;
      break;
    }
  }
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{' || ch === '[') {
      depth++;
    } else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  // Не закрылось до конца текста — вероятно, ответ обрезан. Возвращаем
  // всё до конца текста, а не обрезаем на произвольной последней скобке.
  return text.slice(start);
}

/**
 * Извлекает и очищает JSON из сырого текста.
 * Поддерживает авто-восстановление обрезанных JSON (Unexpected end of JSON input).
 */
export function cleanJson(raw: string): string {
  // 1. Удаляем markdown-обёртки
  let cleaned = raw.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, function(
    _match: string,
    content: string
  ): string {
    return content;
  });

  // 2. Ищем первый JSON-объект или массив (корректно по глубине вложенности)
  const block = extractJsonBlock(cleaned);
  if (block !== null) {
    cleaned = block;
  }

  // 3. Удаляем комментарии
  cleaned = cleaned.replace(/\/\/.*?$/gm, "");
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");

  // 4. Заменяем кавычки-ёлочки на одинарные
  cleaned = cleaned.replace(/«/g, "'").replace(/»/g, "'");

  // 5. Нормализуем кавычки (одинарные → двойные вне строк)
  let fixed = "";
  let inDoubleQuotes = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '"' && (i === 0 || cleaned[i - 1] !== "\\")) {
      inDoubleQuotes = !inDoubleQuotes;
      fixed += ch;
    } else if (ch === "'" && !inDoubleQuotes) {
      fixed += '"';
    } else {
      fixed += ch;
    }
  }
  cleaned = fixed;

  // 6. Удаляем завершающие запятые
  cleaned = cleaned.replace(/,\s*}/g, "}");
  cleaned = cleaned.replace(/,\s*]/g, "]");

  // 7. Удаляем BOM
  cleaned = cleaned.replace(/^\uFEFF/, "");

  // 8. Пробуем восстановить обрезанный JSON
  // Если строка заканчивается на незавершённое поле, убираем последний фрагмент до последней запятой
  let repaired = cleaned;
  try {
    JSON.parse(repaired);
    return repaired.trim();
  } catch (_e) {
    // Пробуем восстановить: ищем последнюю запятую или начало объекта/массива
    // и обрезаем до последней завершённой структуры
    const lastComma = repaired.lastIndexOf(',');
    const lastOpenBrace = repaired.lastIndexOf('{');
    const lastOpenBracket = repaired.lastIndexOf('[');

    let cutPos = repaired.length;
    // Если есть запятая, попробуем обрезать после неё
    if (lastComma > 0) {
      const candidate = repaired.substring(0, lastComma) + '}';
      try {
        JSON.parse(candidate);
        return candidate.trim();
      } catch (_e2) {
        // не сработало, попробуем с массивом
        const candidate2 = repaired.substring(0, lastComma) + ']';
        try {
          JSON.parse(candidate2);
          return candidate2.trim();
        } catch (_e3) {
          // не сработало, пробуем отрезать до последней открывающей скобки
        }
      }
    }

    // Если есть незавершённый объект, обрежем до его начала и попробуем закрыть
    if (lastOpenBrace > 0 && lastOpenBrace > lastOpenBracket) {
      // просто вернём как есть, но с закрывающей скобкой
      const candidate3 = repaired.substring(0, lastOpenBrace) + '{}';
      try {
        JSON.parse(candidate3);
        return candidate3.trim();
      } catch (_e4) {
        // ничего
      }
    }

    // Если ничего не помогло, возвращаем оригинал
    return repaired.trim();
  }
}

/**
 * P3: Экранирует незаэкранированные кавычки ВНУТРИ строковых значений.
 *
 * Слабые/бесплатные модели часто вставляют в описание буквальные кавычки
 * (например, цитируя название игры: текст в духе "Boom Beach" внутри
 * другой JSON-строки). Для JSON.parse это выглядит как преждевременное
 * завершение строки — именно так ломался NicheHunter.
 *
 * Эвристика: находясь внутри строки, кавычка считается РЕАЛЬНЫМ концом
 * строки только если следующий (после пробелов) значимый символ — один
 * из `,` `}` `]` `:` или конец текста. Иначе это "кавычка внутри текста",
 * и мы её экранируем.
 */
export function repairUnescapedQuotes(input: string): string {
  let result = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (!inString) {
      result += ch;
      if (ch === '"') inString = true;
      continue;
    }

    if (escape) {
      result += ch;
      escape = false;
      continue;
    }

    if (ch === '\\') {
      result += ch;
      escape = true;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) j++;
      const next = input[j];

      // `:` / `}` / `]` / конец текста — однозначный признак настоящего
      // конца строки (в естественном тексте такого сочетания не бывает).
      let isRealClose = next === undefined || next === '}' || next === ']' || next === ':';

      // `,` неоднозначна: это может быть как разделитель JSON, так и
      // обычная запятая внутри предложения после цитаты (частый случай
      // в русском тексте: "Boom Beach", где игрок...). Смотрим, что идёт
      // ПОСЛЕ запятой — настоящий JSON-разделитель всегда продолжается
      // новым ключом/значением, а не строчной буквой.
      if (!isRealClose && next === ',') {
        let k = j + 1;
        while (k < input.length && /\s/.test(input[k])) k++;
        const afterComma = input[k];
        isRealClose =
          afterComma === '"' ||
          afterComma === '{' ||
          afterComma === '[' ||
          afterComma === '-' ||
          (afterComma !== undefined && /[0-9tfn]/.test(afterComma));
      }

      if (isRealClose) {
        result += ch;
        inString = false;
      } else {
        result += '\\"';
      }
      continue;
    }

    result += ch;
  }

  return result;
}

/**
 * P3: Корректно "дозакрывает" оборванный JSON на любой глубине вложенности.
 *
 * Прежняя логика (см. ниже, шаг 4) умела добавить лишь одну закрывающую
 * скобку и работала только для плоских структур. Для массива вложенных
 * объектов (ровно наш случай — 5-7 объектов-ниш с вложенными массивами
 * existingGames) при обрыве ответа модели этого недостаточно.
 *
 * Здесь мы отслеживаем стек открытых `{`/`[` вне строк. Если текст
 * обрывается посреди незакрытой строки — отрезаем незавершённый хвост
 * до последней запятой и пересчитываем стек уже для обрезанного текста,
 * а затем закрываем все накопленные скобки в правильном порядке.
 */
export function closeUnterminatedJson(input: string): string {
  // Проход 1: ищем последнюю СТРУКТУРНО безопасную точку обрезки —
  // позицию сразу после запятой или открывающей скобки, встреченной ВНЕ
  // строки. Важно делать это именно вне строк: если оборванное строковое
  // значение само содержит запятую (обычное дело в русском тексте, напр.
  // "стройка баз, коопер"), naïve lastIndexOf(',') по всему тексту находит
  // эту "запятую внутри текста" вместо настоящего разделителя полей и
  // обрезка получается кривой.
  let inString = false;
  let escape = false;
  const stack: string[] = [];
  let lastSafeCut = -1;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{' || ch === '[') {
      stack.push(ch);
      lastSafeCut = i + 1;
    } else if (ch === '}' || ch === ']') {
      stack.pop();
      lastSafeCut = i + 1;
    } else if (ch === ',') {
      lastSafeCut = i + 1;
    }
  }

  // Если обрыв случился прямо посреди строки — отбрасываем весь
  // незавершённый ключ/элемент целиком, откатываясь к последней
  // структурно-корректной точке.
  let result = inString ? (lastSafeCut >= 0 ? input.slice(0, lastSafeCut) : '') : input;

  // Проход 2: пересчитываем стек уже для (возможно обрезанного) результата.
  const finalStack: string[] = [];
  {
    let s = false;
    let e = false;
    for (let i = 0; i < result.length; i++) {
      const ch = result[i];
      if (s) {
        if (e) {
          e = false;
        } else if (ch === '\\') {
          e = true;
        } else if (ch === '"') {
          s = false;
        }
        continue;
      }
      if (ch === '"') {
        s = true;
      } else if (ch === '{' || ch === '[') {
        finalStack.push(ch);
      } else if (ch === '}' || ch === ']') {
        finalStack.pop();
      }
    }
  }

  result = result.replace(/,\s*$/, '');
  while (finalStack.length) {
    const open = finalStack.pop();
    result = result.replace(/,\s*$/, '');
    result += open === '{' ? '}' : ']';
  }

  return result;
}

/**
 * P3: Если ни один уровень восстановления не сработал — сохраняем сырой
 * ответ модели целиком (а не только первые 200 символов, как в консоли)
 * в output/debug/, чтобы можно было разобрать реальную причину, а не
 * гадать по обрезанному логу.
 */
function dumpParseFailure(raw: string, attempts: Record<string, string>): void {
  try {
    const dir = path.join(process.cwd(), 'output', 'debug');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `parse-fail-${Date.now()}.json`);
    fs.writeFileSync(
      file,
      JSON.stringify({ timestamp: new Date().toISOString(), raw, attempts }, null, 2),
      'utf-8'
    );
    console.error(`🐛 Полный сырой ответ модели сохранён для отладки: ${file}`);
  } catch {
    // Не даём ошибке записи заслонить исходную ошибку парсинга.
  }
}

/**
 * Единая надёжная функция парсинга JSON из сырого ответа LLM.
 *
 * Заменяет 7 почти идентичных копий, которые ранее были разбросаны по
 * market-analyst.ts, niche-hunter.ts, concept-agent.ts, concept-validator.ts,
 * game-architect.ts (parseJson), code-agent.ts (parseCodeJson) и
 * review-agent.ts (parseFixedCode).
 *
 * В отличие от прежних копий, здесь нет псевдо-retry-цикла: cleanJson —
 * чистая функция от неизменного входа, повторный вызов на том же тексте
 * детерминированно даёт тот же результат. Вместо этого — один линейный
 * проход с несколькими уровнями фолбэка (что и приносило реальную пользу
 * в прежних версиях):
 *   1. Базовая очистка (cleanJson) + прямой JSON.parse.
 *   2. Извлечение JSON-блока (объект или массив) регуляркой + повторный parse.
 *   3. Жёсткое восстановление (кавычки, висячие запятые, спецсимволы) + parse.
 *   4. Обрезание до последней валидной закрывающей скобки/квадратной скобки.
 *   5. P3: экранирование "кавычек внутри текста" (repairUnescapedQuotes) —
 *      частая причина обрыва парсинга у слабых моделей, когда в описании
 *      цитируется название игры в кавычках.
 *   6. P3: корректное дозакрытие оборванного JSON на любой глубине
 *      вложенности (closeUnterminatedJson), а не только один уровень скобок.
 *   7. Комбинация уровней 5+6 вместе — самый частый реальный случай:
 *      кавычка внутри текста ломает parser РАНЬШЕ, чем модель успевает
 *      закрыть все скобки (или ответ обрывается по maxTokens).
 * Если ни один уровень не помог — сохраняем полный сырой ответ и все
 * промежуточные попытки в output/debug/ для последующей диагностики.
 */
export function parseJsonWithRecovery<T = any>(text: string): T {
  const attempts: Record<string, string> = { '0_raw': text };

  // 1. Базовая очистка + прямой парсинг
  let cleaned = cleanJson(text);
  attempts['1_cleaned'] = cleaned;
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // продолжаем к следующему уровню восстановления
  }

  // 2. Извлечение JSON-блока (объект или массив), с учётом глубины вложенности
  const block = extractJsonBlock(cleaned);
  if (block === null) {
    throw new Error('JSON-блок не найден в ответе модели.');
  }

  const extracted = cleanJson(block);
  attempts['2_extracted'] = extracted;
  try {
    return JSON.parse(extracted) as T;
  } catch {
    // продолжаем к следующему уровню восстановления
  }

  // 3. Жёсткое восстановление
  const repaired = extracted
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
    .replace(/:\s*'([^']*)'/g, ':"$1"')
    .replace(/«|»/g, '"')
    .replace(/—/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .trim();
  attempts['3_repaired'] = repaired;

  try {
    return JSON.parse(repaired) as T;
  } catch {
    // продолжаем к следующему уровню восстановления
  }

  // 4. Обрезание до последней валидной закрывающей скобки
  const lastBrace = repaired.lastIndexOf('}');
  if (lastBrace > 0) {
    const truncated = repaired.substring(0, lastBrace + 1);
    try {
      return JSON.parse(truncated) as T;
    } catch {
      // не сработало
    }
  }
  const lastBracket = repaired.lastIndexOf(']');
  if (lastBracket > 0) {
    const truncated = repaired.substring(0, lastBracket + 1);
    try {
      return JSON.parse(truncated) as T;
    } catch {
      // не сработало
    }
  }

  // 5. Экранирование кавычек внутри текстовых значений
  const quotesFixed = repairUnescapedQuotes(repaired);
  attempts['5_quotes_fixed'] = quotesFixed;
  try {
    return JSON.parse(quotesFixed) as T;
  } catch {
    // продолжаем к следующему уровню восстановления
  }

  // 6. Корректное дозакрытие оборванного JSON (любая глубина вложенности)
  const closed = closeUnterminatedJson(repaired);
  attempts['6_closed'] = closed;
  try {
    return JSON.parse(closed) as T;
  } catch {
    // продолжаем к последнему уровню восстановления
  }

  // 7. Оба восстановления вместе — самый частый реальный случай на практике
  const combined = closeUnterminatedJson(repairUnescapedQuotes(repaired));
  attempts['7_combined'] = combined;
  try {
    return JSON.parse(combined) as T;
  } catch {
    // ничего не помогло
  }

  dumpParseFailure(text, attempts);
  throw new Error('Не удалось распарсить JSON из ответа модели ни одним из доступных способов восстановления.');
}