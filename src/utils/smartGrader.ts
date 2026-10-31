/**
 * DE ACADEMY — Умный грейдер верификации решений (Smart Grader)
 * Проверяет результат студента против эталонного решения с нормализацией схемы,
 * округлением чисел, сортировкой и детальной диагностикой расхождений.
 */

import { LessonTestConfig } from '@/types/course';

export type TableCell = string | number | boolean | null;

export interface GraderResult {
  passed: boolean;
  feedback: string;
  userColumns?: string[];
  expectedColumns?: string[];
  userRowCount?: number;
  expectedRowCount?: number;
}

/**
 * XSS Санитизация строковых значений для предотвращения инъекций в UI
 */
export function sanitizeCell(val: unknown): TableCell {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'boolean') return val;

  const str = String(val);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Санитизирует всю таблицу данных
 */
export function sanitizeRows(rows: unknown[][]): TableCell[][] {
  return rows.map((row) => row.map(sanitizeCell));
}

/**
 * Нормализует имя колонки (trim + lowercase)
 */
export function normalizeColName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Сравнивает два значения с учетом типа, null и погрешности float
 */
function valuesEqual(a: TableCell, b: TableCell, precision = 2): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;

  // Числовое сравнение с плавающей точкой
  const numA = typeof a === 'number' ? a : !isNaN(Number(a)) && a !== '' ? Number(a) : NaN;
  const numB = typeof b === 'number' ? b : !isNaN(Number(b)) && b !== '' ? Number(b) : NaN;

  if (!isNaN(numA) && !isNaN(numB)) {
    const factor = Math.pow(10, precision);
    return Math.round(numA * factor) === Math.round(numB * factor);
  }

  // Строковое сравнение
  const strA = String(a).trim();
  const strB = String(b).trim();
  return strA === strB;
}

/**
 * Каноническая сортировка строк по всем колонкам
 */
function sortRowsCanonically(rows: TableCell[][]): TableCell[][] {
  return [...rows].sort((rowA, rowB) => {
    for (let i = 0; i < Math.max(rowA.length, rowB.length); i++) {
      const valA = rowA[i] ?? '';
      const valB = rowB[i] ?? '';
      const strA = String(valA);
      const strB = String(valB);
      if (strA < strB) return -1;
      if (strA > strB) return 1;
    }
    return 0;
  });
}

/**
 * Проверка наличия обязательных архитектурных паттернов в коде (anti-cheat)
 */
export function checkRequiredPatterns(
  code: string,
  requiredPatterns: string[] = []
): { passed: boolean; missingPattern?: string } {
  for (const pattern of requiredPatterns) {
    const cleanPattern = pattern.trim();
    if (!cleanPattern) continue;

    // Регулярное выражение с границами слов (case-insensitive)
    const escaped = cleanPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');

    if (!regex.test(code)) {
      return { passed: false, missingPattern: cleanPattern };
    }
  }

  return { passed: true };
}

/**
 * Главная функция умного сравнения результата студента с эталоном
 */
export function gradeSolution(
  userCode: string,
  userColumns: string[] = [],
  userRows: TableCell[][] = [],
  expectedColumns: string[] = [],
  expectedRows: TableCell[][] = [],
  config: LessonTestConfig = { checkOrder: false, floatPrecision: 2 }
): GraderResult {
  // 1. Проверка обязательных паттернов кода (AST / ключевые слова)
  if (config.requiredAstPatterns && config.requiredAstPatterns.length > 0) {
    const patternCheck = checkRequiredPatterns(userCode, config.requiredAstPatterns);
    if (!patternCheck.passed) {
      return {
        passed: false,
        feedback: `В решении отсутствует обязательная конструкция: «${patternCheck.missingPattern}». Задача требует применения именно этого инженерного подхода, а не ручного хардкода значений.`,
        userColumns,
        expectedColumns,
        userRowCount: userRows.length,
        expectedRowCount: expectedRows.length,
      };
    }
  }

  // 2. Проверка количества колонок
  if (userColumns.length !== expectedColumns.length) {
    const expCols = expectedColumns.map((c) => `\`${c}\``).join(', ');
    const userCols = userColumns.length > 0 ? userColumns.map((c) => `\`${c}\``).join(', ') : 'нет';
    return {
      passed: false,
      feedback: `Не совпадает количество колонок. Ожидалось ${expectedColumns.length} (${expCols}), а получено: ${userColumns.length} (${userCols}).`,
      userColumns,
      expectedColumns,
      userRowCount: userRows.length,
      expectedRowCount: expectedRows.length,
    };
  }

  // 3. Нормализация имен колонок (trim + lowercase)
  const normUserCols = userColumns.map(normalizeColName);
  const normExpCols = expectedColumns.map(normalizeColName);

  for (let i = 0; i < normExpCols.length; i++) {
    const expCol = normExpCols[i];
    if (!normUserCols.includes(expCol)) {
      return {
        passed: false,
        feedback: `Колонка «${expectedColumns[i]}» отсутствует в результирующей выборке. Проверьте алиасы колонок через «AS ${expectedColumns[i]}».`,
        userColumns,
        expectedColumns,
        userRowCount: userRows.length,
        expectedRowCount: expectedRows.length,
      };
    }
  }

  // 4. Проверка соответствия строк
  // Переставляем колонки студента в порядок эталона, если порядок колонок отличается
  const colIndexMap = normExpCols.map((expCol) => normUserCols.indexOf(expCol));

  let remappedUserRows = userRows.map((row) =>
    colIndexMap.map((idx) => (idx >= 0 && idx < row.length ? row[idx] : null))
  );
  let finalExpRows = expectedRows;

  // 5. Проверка количества строк
  if (remappedUserRows.length !== finalExpRows.length) {
    return {
      passed: false,
      feedback: `Количество строк не совпадает: ваш запрос вернул ${remappedUserRows.length} строк вместо ${finalExpRows.length}. Проверьте условия фильтрации WHERE или размножение строк при некорректном JOIN.`,
      userColumns,
      expectedColumns,
      userRowCount: remappedUserRows.length,
      expectedRowCount: finalExpRows.length,
    };
  }

  // 6. Сортировка строк (если порядок строк не имеет значения)
  if (!config.checkOrder) {
    remappedUserRows = sortRowsCanonically(remappedUserRows);
    finalExpRows = sortRowsCanonically(finalExpRows);
  }

  // 7. Поэлементное сравнение ячеек таблицы
  const precision = config.floatPrecision ?? 2;

  for (let r = 0; r < finalExpRows.length; r++) {
    const uRow = remappedUserRows[r];
    const eRow = finalExpRows[r];

    for (let c = 0; c < normExpCols.length; c++) {
      const uVal = uRow ? uRow[c] : null;
      const eVal = eRow ? eRow[c] : null;

      if (!valuesEqual(uVal, eVal, precision)) {
        const colName = expectedColumns[c];
        const valGot = uVal === null ? 'NULL' : String(uVal);
        const valExp = eVal === null ? 'NULL' : String(eVal);

        return {
          passed: false,
          feedback: `Расхождение в строке #${r + 1}, колонка «${colName}»: получено «${valGot}», ожидалось «${valExp}».`,
          userColumns,
          expectedColumns,
          userRowCount: remappedUserRows.length,
          expectedRowCount: finalExpRows.length,
        };
      }
    }
  }

  // Все проверки успешно пройдены!
  return {
    passed: true,
    feedback: `✓ Решение полностью верное! Все данные, типы колонок и расчетные метрики сошлись с эталоном.`,
    userColumns,
    expectedColumns,
    userRowCount: remappedUserRows.length,
    expectedRowCount: finalExpRows.length,
  };
}
