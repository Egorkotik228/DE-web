/**
 * DE ACADEMY — WebAssembly SQL Worker (Stand-alone Worker Script)
 */

let SQLInstance = null;

const LOCAL_WASM_PATH = '/engines/sql-wasm.wasm';
const FALLBACK_CDN_WASM_1 = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm';
const FALLBACK_CDN_WASM_2 = 'https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/sql-wasm.wasm';

const FALLBACK_CDN_JS_1 = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.js';
const FALLBACK_CDN_JS_2 = 'https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/sql-wasm.js';

function sanitizeCell(val) {
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

function sanitizeRows(rows) {
  return rows.map((row) => row.map(sanitizeCell));
}

function normalizeColName(name) {
  return name.trim().toLowerCase();
}

function valuesEqual(a, b, precision = 2) {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  const numA = typeof a === 'number' ? a : !isNaN(Number(a)) && a !== '' ? Number(a) : NaN;
  const numB = typeof b === 'number' ? b : !isNaN(Number(b)) && b !== '' ? Number(b) : NaN;
  if (!isNaN(numA) && !isNaN(numB)) {
    const factor = Math.pow(10, precision);
    return Math.round(numA * factor) === Math.round(numB * factor);
  }
  return String(a).trim() === String(b).trim();
}

function sortRowsCanonically(rows) {
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

function checkRequiredPatterns(code, requiredPatterns = []) {
  for (const pattern of requiredPatterns) {
    const cleanPattern = pattern.trim();
    if (!cleanPattern) continue;
    const escaped = cleanPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (!regex.test(code)) {
      return { passed: false, missingPattern: cleanPattern };
    }
  }
  return { passed: true };
}

function gradeSolution(userCode, userColumns, userRows, expectedColumns, expectedRows, config = { checkOrder: false, floatPrecision: 2 }) {
  if (config.requiredAstPatterns && config.requiredAstPatterns.length > 0) {
    const check = checkRequiredPatterns(userCode, config.requiredAstPatterns);
    if (!check.passed) {
      return {
        passed: false,
        feedback: `В решении отсутствует обязательная конструкция: «${check.missingPattern}». Задача требует применения именно этого инженерного подхода, а не ручного хардкода значений.`
      };
    }
  }

  if (userColumns.length !== expectedColumns.length) {
    const expCols = expectedColumns.map((c) => `\`${c}\``).join(', ');
    const userCols = userColumns.length > 0 ? userColumns.map((c) => `\`${c}\``).join(', ') : 'нет';
    return {
      passed: false,
      feedback: `Не совпадает количество колонок. Ожидалось ${expectedColumns.length} (${expCols}), а получено: ${userColumns.length} (${userCols}).`
    };
  }

  const normUserCols = userColumns.map(normalizeColName);
  const normExpCols = expectedColumns.map(normalizeColName);

  for (let i = 0; i < normExpCols.length; i++) {
    const expCol = normExpCols[i];
    if (!normUserCols.includes(expCol)) {
      return {
        passed: false,
        feedback: `Колонка «${expectedColumns[i]}» отсутствует в результирующей выборке. Проверьте алиасы колонок через «AS ${expectedColumns[i]}».`
      };
    }
  }

  const colIndexMap = normExpCols.map((expCol) => normUserCols.indexOf(expCol));
  let remappedUserRows = userRows.map((row) =>
    colIndexMap.map((idx) => (idx >= 0 && idx < row.length ? row[idx] : null))
  );
  let finalExpRows = expectedRows;

  if (remappedUserRows.length !== finalExpRows.length) {
    return {
      passed: false,
      feedback: `Количество строк не совпадает: ваш запрос вернул ${remappedUserRows.length} строк вместо ${finalExpRows.length}. Проверьте условия фильтрации WHERE или размножение строк при некорректном JOIN.`
    };
  }

  if (!config.checkOrder) {
    remappedUserRows = sortRowsCanonically(remappedUserRows);
    finalExpRows = sortRowsCanonically(finalExpRows);
  }

  const precision = config.floatPrecision ?? 2;
  for (let r = 0; r < finalExpRows.length; r++) {
    const uRow = remappedUserRows[r];
    const eRow = finalExpRows[r];
    for (let c = 0; c < finalExpCols.length; c++) {
      const uVal = uRow ? uRow[c] : null;
      const eVal = eRow ? eRow[c] : null;
      if (!valuesEqual(uVal, eVal, precision)) {
        const colName = expectedColumns[c];
        const valGot = uVal === null ? 'NULL' : String(uVal);
        const valExp = eVal === null ? 'NULL' : String(eVal);
        return {
          passed: false,
          feedback: `Расхождение в строке #${r + 1}, колонка «${colName}»: получено «${valGot}», ожидалось «${valExp}».`
        };
      }
    }
  }

  return {
    passed: true,
    feedback: `✓ Решение полностью верное! Все данные, типы колонок и расчетные метрики сошлись с эталоном.`
  };
}

function translateSqlError(rawError) {
  const errorText = String(rawError);
  let friendlyMessage = 'Синтаксическая или логическая ошибка SQL.';

  if (/no such table:\s*([^\s,;]+)/i.test(errorText)) {
    const match = errorText.match(/no such table:\s*([^\s,;]+)/i);
    friendlyMessage = `Таблица «${match ? match[1] : ''}» не найдена в базе данных. Проверьте правильность написания имени таблицы или создание через CREATE TABLE.`;
  } else if (/no such column:\s*([^\s,;]+)/i.test(errorText)) {
    const match = errorText.match(/no such column:\s*([^\s,;]+)/i);
    friendlyMessage = `Колонка «${match ? match[1] : ''}» не существует в указанной таблице. Проверьте опечатки в SELECT/WHERE или используйте алиасы таблиц при JOIN.`;
  } else if (/ambiguous column name:\s*([^\s,;]+)/i.test(errorText)) {
    const match = errorText.match(/ambiguous column name:\s*([^\s,;]+)/i);
    friendlyMessage = `Неоднозначное имя колонки «${match ? match[1] : ''}». Укажите алиас таблицы, например: «t1.${match ? match[1] : ''}».`;
  } else if (/misuse of aggregate/i.test(errorText)) {
    friendlyMessage = `Некорректное использование агрегатной функции. Агрегаты нельзя применять в секции WHERE — используйте подзапрос, HAVING или оконные функции с OVER().`;
  } else if (/syntax error near\s*["']?([^"'\n]+)["']?/i.test(errorText)) {
    const match = errorText.match(/syntax error near\s*["']?([^"'\n]+)["']?/i);
    friendlyMessage = `Синтаксическая ошибка SQL рядом с «${match ? match[1] : ''}». Проверьте пропущенные запятые, незакрытые скобки или порядок операторов.`;
  } else {
    friendlyMessage = `Ошибка SQLite: ${errorText}`;
  }

  return {
    friendlyMessage,
    rawError: errorText,
  };
}

async function getOrInitSQL() {
  if (SQLInstance) return SQLInstance;

  if (typeof self.initSqlJs !== 'function') {
    try {
      self.importScripts('/engines/sql-wasm.js');
    } catch {
      try {
        self.importScripts(FALLBACK_CDN_JS_1);
      } catch {
        self.importScripts(FALLBACK_CDN_JS_2);
      }
    }
  }

  if (typeof self.initSqlJs !== 'function') {
    throw new Error('Не удалось загрузить модуль sql.js');
  }

  try {
    SQLInstance = await self.initSqlJs({
      locateFile: (file) => file.endsWith('.wasm') ? LOCAL_WASM_PATH : file,
    });
    return SQLInstance;
  } catch (err) {
    try {
      SQLInstance = await self.initSqlJs({
        locateFile: (file) => file.endsWith('.wasm') ? FALLBACK_CDN_WASM_1 : file,
      });
      return SQLInstance;
    } catch {
      SQLInstance = await self.initSqlJs({
        locateFile: (file) => file.endsWith('.wasm') ? FALLBACK_CDN_WASM_2 : file,
      });
      return SQLInstance;
    }
  }
}

function runSqlTransaction(SQL, seedCode, queryCode) {
  const db = new SQL.Database();
  try {
    if (seedCode && seedCode.trim()) {
      db.run(seedCode);
    }

    const start = performance.now();
    const results = db.exec(queryCode);
    const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;

    let columns = [];
    let rows = [];

    if (results && results.length > 0) {
      const lastResult = results[results.length - 1];
      columns = lastResult.columns;
      rows = sanitizeRows(lastResult.values);
    } else {
      columns = ['status'];
      rows = [['Запрос успешно выполнен']];
    }

    return { columns, rows, executionTimeMs };
  } finally {
    try {
      db.close();
    } catch {
      // ignore
    }
  }
}

self.onmessage = async (event) => {
  const { requestId, type, seedCode, userCode, solutionCode, testConfig } = event.data;

  try {
    const SQL = await getOrInitSQL();

    if (type === 'INIT') {
      self.postMessage({
        requestId,
        status: 'READY',
        executionTimeMs: 0,
        stdout: 'SQLite WebAssembly engine is ready.',
      });
      return;
    }

    if (type === 'RUN') {
      const { columns, rows, executionTimeMs } = runSqlTransaction(SQL, seedCode, userCode);
      self.postMessage({
        requestId,
        status: 'SUCCESS',
        executionTimeMs,
        columns,
        rows,
        stdout: `Выполнено за ${executionTimeMs} мс. Найдено строк: ${rows.length}.`,
      });
      return;
    }

    if (type === 'VERIFY') {
      const userResult = runSqlTransaction(SQL, seedCode, userCode);
      const refCode = solutionCode || userCode;
      const refResult = runSqlTransaction(SQL, seedCode, refCode);

      const grade = gradeSolution(
        userCode,
        userResult.columns,
        userResult.rows,
        refResult.columns,
        refResult.rows,
        testConfig
      );

      self.postMessage({
        requestId,
        status: grade.passed ? 'SUCCESS' : 'ERROR',
        executionTimeMs: userResult.executionTimeMs,
        columns: userResult.columns,
        rows: userResult.rows,
        stdout: grade.feedback,
        verification: {
          passed: grade.passed,
          feedback: grade.feedback,
        },
      });
      return;
    }
  } catch (err) {
    const translated = translateSqlError(err);
    self.postMessage({
      requestId,
      status: 'ERROR',
      executionTimeMs: 0,
      columns: ['error'],
      rows: [[translated.friendlyMessage]],
      errorDetails: translated,
      verification: {
        passed: false,
        feedback: translated.friendlyMessage,
      },
    });
  }
};
