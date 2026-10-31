/**
 * DE ACADEMY — Русскоязычный транслятор и диагност ошибок
 * Очищает системный стек Wasm/Pyodide и объясняет ошибку простыми словами
 */

export interface TranslatedError {
  line?: number;
  friendlyMessage: string;
  rawError: string;
}

/**
 * Очищает стек-трейс от внутренних системных вызовов Pyodide/Emscripten/Wasm
 */
export function cleanStackTrace(rawError: string): string {
  if (!rawError) return '';

  return rawError
    .split('\n')
    .filter((line) => {
      const lower = line.toLowerCase();
      if (lower.includes('wasm-function') || lower.includes('emscripten')) return false;
      if (lower.includes('pyodide.asm') || lower.includes('/lib/python3')) return false;
      if (lower.includes('at new promise') || lower.includes('at async')) return false;
      if (lower.includes('at worker.') || lower.includes('importscripts')) return false;
      return true;
    })
    .join('\n')
    .trim();
}

/**
 * Извлекает номер строки из ошибки Python или SQL
 */
export function extractLineNumber(errorStr: string, codeOffset = 0): number | undefined {
  // Python: File "<exec>", line 4, in <module>
  // or File "<string>", line 4
  const pyMatch = errorStr.match(/line\s+(\d+)/i);
  if (pyMatch && pyMatch[1]) {
    const rawLine = parseInt(pyMatch[1], 10);
    const adjusted = rawLine - codeOffset;
    return adjusted > 0 ? adjusted : rawLine;
  }

  // SQL syntax error near line X or near offset
  const sqlMatch = errorStr.match(/at line\s+(\d+)/i) || errorStr.match(/line\s+(\d+)/i);
  if (sqlMatch && sqlMatch[1]) {
    const rawLine = parseInt(sqlMatch[1], 10);
    const adjusted = rawLine - codeOffset;
    return adjusted > 0 ? adjusted : rawLine;
  }

  return undefined;
}

/**
 * Главная функция перевода ошибок на инженерный русский язык
 */
export function translateError(
  rawError: string | Error,
  engineType: string = 'sql',
  codeOffset = 0
): TranslatedError {
  const errorText = typeof rawError === 'string' ? rawError : rawError?.message || String(rawError);
  const cleaned = cleanStackTrace(errorText);
  const line = extractLineNumber(errorText, codeOffset);

  let friendlyMessage = 'Произошла непредвиденная ошибка при выполнении кода.';

  // 1. ОШИБКИ SQL (SQLite / PostgreSQL синтаксис)
  if (engineType === 'sql' || errorText.includes('sqlite3') || errorText.includes('near "')) {
    if (/no such table:\s*([^\s,;]+)/i.test(errorText)) {
      const match = errorText.match(/no such table:\s*([^\s,;]+)/i);
      const tableName = match ? match[1] : '';
      friendlyMessage = `Таблица «${tableName}» не найдена в базе данных. Проверьте правильность написания имени таблицы или создание через CREATE TABLE.`;
    } else if (/no such column:\s*([^\s,;]+)/i.test(errorText)) {
      const match = errorText.match(/no such column:\s*([^\s,;]+)/i);
      const colName = match ? match[1] : '';
      friendlyMessage = `Колонка «${colName}» не существует в указанной таблице. Проверьте опечатки в SELECT/WHERE или используйте алиасы таблиц при JOIN.`;
    } else if (/ambiguous column name:\s*([^\s,;]+)/i.test(errorText)) {
      const match = errorText.match(/ambiguous column name:\s*([^\s,;]+)/i);
      const colName = match ? match[1] : '';
      friendlyMessage = `Неоднозначное имя колонки «${colName}». Это поле присутствует сразу в нескольких объединенных таблицах. Укажите алиас таблицы, например: «t1.${colName}».`;
    } else if (/misuse of aggregate/i.test(errorText)) {
      friendlyMessage = `Некорректное использование агрегатной функции (SUM, AVG, COUNT). Агрегаты нельзя применять в секции WHERE — используйте подзапрос, HAVING или оконные функции с OVER().`;
    } else if (/syntax error near\s*["']?([^"'\n]+)["']?/i.test(errorText)) {
      const match = errorText.match(/syntax error near\s*["']?([^"'\n]+)["']?/i);
      const token = match ? match[1] : '';
      friendlyMessage = `Синтаксическая ошибка SQL рядом с «${token}». Проверьте пропущенные запятые между колонками, незакрытые скобки или порядок операторов (SELECT -> FROM -> WHERE -> GROUP BY -> HAVING -> ORDER BY).`;
    } else if (/not enough values|too many values/i.test(errorText)) {
      friendlyMessage = `Несоответствие количества колонок и значений в INSERT или объединении UNION.`;
    } else if (/datatype mismatch/i.test(errorText)) {
      friendlyMessage = `Несоответствие типов данных (Datatype mismatch). Например, попытка арифметических операций над строкой или некорректный формат даты.`;
    } else if (/UNIQUE constraint failed/i.test(errorText)) {
      friendlyMessage = `Нарушение уникальности первичного ключа (UNIQUE/PRIMARY KEY constraint failed). Вставляемая запись дублирует существующий ключ.`;
    } else if (/NOT NULL constraint failed:\s*([^\s,;]+)/i.test(errorText)) {
      const match = errorText.match(/NOT NULL constraint failed:\s*([^\s,;]+)/i);
      friendlyMessage = `Поле «${match ? match[1] : ''}» не может быть пустым (NULL). Передайте непустое значение или укажите значение по умолчанию (DEFAULT).`;
    } else if (/GROUP BY/i.test(errorText)) {
      friendlyMessage = `Ошибка группировки GROUP BY: все неагрегированные поля в SELECT должны быть перечислены в секции GROUP BY.`;
    } else {
      friendlyMessage = `Синтаксическая или логическая ошибка SQL: ${cleaned.split('\n')[0]}`;
    }
  }

  // 2. ОШИБКИ PYTHON / PANDAS / PYSPARK
  else {
    if (/KeyError:\s*['"]?([^'"\n]+)['"]?/i.test(errorText)) {
      const match = errorText.match(/KeyError:\s*['"]?([^'"\n]+)['"]?/i);
      const key = match ? match[1] : '';
      friendlyMessage = `Ошибка ключа (KeyError): колонка «${key}» отсутствует в DataFrame. Проверьте точное имя колонки, регистр букв и отсутствие лишних пробелов.`;
    } else if (/NameError:\s*name\s*['"]([^'"]+)['"]\s*is not defined/i.test(errorText)) {
      const match = errorText.match(/NameError:\s*name\s*['"]([^'"]+)['"]\s*is not defined/i);
      const name = match ? match[1] : '';
      if (name === 'F') {
        friendlyMessage = `Переменная «F» не определена. В PySpark добавьте импорт: «from pyspark.sql import functions as F».`;
      } else if (name === 'Window') {
        friendlyMessage = `Класс «Window» не определен. В PySpark добавьте импорт: «from pyspark.sql.window import Window».`;
      } else if (name === 'pd' || name === 'pandas') {
        friendlyMessage = `Библиотека pandas не импортирована. Добавьте «import pandas as pd».`;
      } else {
        friendlyMessage = `Переменная или функция «${name}» не объявлена. Проверьте опечатки в названии или предшествующее присвоение.`;
      }
    } else if (/IndentationError:\s*(.+)/i.test(errorText)) {
      const match = errorText.match(/IndentationError:\s*(.+)/i);
      friendlyMessage = `Ошибка отступов (IndentationError): ${match ? match[1] : 'нарушена вложенность'}. В Python отступы определяют структуру кода. Используйте ровно 4 пробела для каждого блока.`;
    } else if (/SyntaxError:\s*(.+)/i.test(errorText)) {
      const match = errorText.match(/SyntaxError:\s*(.+)/i);
      friendlyMessage = `Синтаксическая ошибка Python: ${match ? match[1] : 'некорректный синтаксис'}. Проверьте двоеточия после if/def/for, парные кавычки и закрывающие скобки.`;
    } else if (/AttributeError:\s*['"]?([^'"\n]+)['"]?\s*object has no attribute\s*['"]?([^'"\n]+)['"]?/i.test(errorText)) {
      const match = errorText.match(/AttributeError:\s*['"]?([^'"\n]+)['"]?\s*object has no attribute\s*['"]?([^'"\n]+)['"]?/i);
      const type = match ? match[1] : 'объекта';
      const attr = match ? match[2] : 'атрибут';
      friendlyMessage = `У ${type} отсутствует метод или атрибут «${attr}». Проверьте тип переменной и сигнатуру метода в документации.`;
    } else if (/ZeroDivisionError/i.test(errorText)) {
      friendlyMessage = `Деление на ноль (ZeroDivisionError). В дата-пайплайнах деление на ноль часто рушит расчет метрик (CR, ROI, ARPU). Защитите формулу через условие или NULL.`;
    } else if (/SettingWithCopyWarning/i.test(errorText)) {
      friendlyMessage = `Предупреждение Pandas (SettingWithCopyWarning): попытка модифицировать срез DataFrame. Используйте метод .copy() или конструкцию df.loc[:, col] = ...`;
    } else if (/TypeError:\s*(.+)/i.test(errorText)) {
      const match = errorText.match(/TypeError:\s*(.+)/i);
      friendlyMessage = `Ошибка типа данных (TypeError): ${match ? match[1] : 'несовместимые типы'}. Проверьте типы аргументов функций (например, попытка сложить int и str).`;
    } else if (/ValueError:\s*(.+)/i.test(errorText)) {
      const match = errorText.match(/ValueError:\s*(.+)/i);
      friendlyMessage = `Некорректное значение аргумента (ValueError): ${match ? match[1] : 'проверьте входные параметры'}.`;
    } else if (/IndexError:\s*(.+)/i.test(errorText)) {
      friendlyMessage = `Индекс вне диапазона (IndexError): обращение к несуществующему элементу списка или кортежа.`;
    } else {
      friendlyMessage = `Ошибка выполнения: ${cleaned.split('\n')[0] || errorText}`;
    }
  }

  return {
    line,
    friendlyMessage,
    rawError: cleaned || errorText,
  };
}
