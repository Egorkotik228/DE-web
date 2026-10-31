/**
 * DE ACADEMY — WebAssembly SQL Worker (sql.js)
 * Изолированное выполнение SQLite с поддержкой Window functions, CTE, JSON и индексов
 */

import type { SqlJsStatic } from 'sql.js';
import { WorkerRequest, WorkerResponse } from '@/types/course';
import { translateError } from '@/utils/errorTranslator';
import { gradeSolution, sanitizeRows, TableCell } from '@/utils/smartGrader';

// Объявление интерфейса глобального скоупа воркера
interface SqlWorkerScope {
  initSqlJs?: (config: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>;
  importScripts: (...urls: string[]) => void;
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<WorkerRequest & { solutionCode?: string }>) => void) | null;
}

declare const self: SqlWorkerScope;

let SQLInstance: SqlJsStatic | null = null;

const LOCAL_WASM_PATH = '/engines/sql-wasm.wasm';
const FALLBACK_CDN_WASM_1 = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm';
const FALLBACK_CDN_WASM_2 = 'https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/sql-wasm.wasm';

const FALLBACK_CDN_JS_1 = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.js';
const FALLBACK_CDN_JS_2 = 'https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/sql-wasm.js';

/**
 * Инициализация ядра SQLite WebAssembly с каскадным поиском wasm бинарника
 */
async function getOrInitSQL(): Promise<SqlJsStatic> {
  if (SQLInstance) return SQLInstance;

  // 1. Загрузка скрипта обертки sql-wasm.js
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
    throw new Error('Не удалось загрузить скрипт инициализации sql.js');
  }

  // 2. Инициализация Wasm-модуля с локальным приоритетом
  let instance: SqlJsStatic;
  try {
    instance = await self.initSqlJs({
      locateFile: (file: string) => {
        if (file.endsWith('.wasm')) return LOCAL_WASM_PATH;
        return file;
      },
    });
  } catch (localErr) {
    console.warn('Локальный WASM недоступен, переключение на резервный CDN:', localErr);
    try {
      instance = await self.initSqlJs({
        locateFile: (file: string) => {
          if (file.endsWith('.wasm')) return FALLBACK_CDN_WASM_1;
          return file;
        },
      });
    } catch {
      instance = await self.initSqlJs({
        locateFile: (file: string) => {
          if (file.endsWith('.wasm')) return FALLBACK_CDN_WASM_2;
          return file;
        },
      });
    }
  }

  SQLInstance = instance;
  return instance;
}

/**
 * Выполнение SQL скрипта в чистой транзакции
 */
function runSqlTransaction(
  SQL: SqlJsStatic,
  seedCode: string,
  queryCode: string
): { columns: string[]; rows: TableCell[][]; executionTimeMs: number } {
  const db = new SQL.Database();
  try {
    // 1. Выполнение скрытого сид-скрипта подготовки схемы
    if (seedCode && seedCode.trim()) {
      db.run(seedCode);
    }

    // 2. Замер точного времени исполнения запроса студента
    const start = performance.now();
    const results = db.exec(queryCode);
    const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;

    let columns: string[] = [];
    let rows: TableCell[][] = [];

    if (results && results.length > 0) {
      // Берем последний результат, если было несколько выражений
      const lastResult = results[results.length - 1];
      columns = lastResult.columns;
      rows = sanitizeRows(lastResult.values as unknown[][]);
    } else {
      // Команда DDL/DML без возврата таблицы
      columns = ['status'];
      rows = [['Запрос успешно выполнен']];
    }

    return { columns, rows, executionTimeMs };
  } finally {
    try {
      db.close();
    } catch {
      // игнорируем ошибку закрытия
    }
  }
}

/**
 * Обработчик сообщений от главного потока
 */
self.onmessage = async (event: MessageEvent<WorkerRequest & { solutionCode?: string }>) => {
  const { requestId, type, seedCode, userCode, solutionCode, testConfig } = event.data;

  try {
    const SQL = await getOrInitSQL();

    // Запрос статуса готовности
    if (type === 'INIT') {
      const resp: WorkerResponse = {
        requestId,
        status: 'READY',
        executionTimeMs: 0,
        stdout: 'SQLite 3 WebAssembly engine initialized successfully.',
      };
      self.postMessage(resp);
      return;
    }

    // Запуск пользовательского кода
    if (type === 'RUN') {
      const { columns, rows, executionTimeMs } = runSqlTransaction(SQL, seedCode, userCode);
      const resp: WorkerResponse = {
        requestId,
        status: 'SUCCESS',
        executionTimeMs,
        columns,
        rows,
        stdout: `Выполнено за ${executionTimeMs} мс. Найдено строк: ${rows.length}.`,
      };
      self.postMessage(resp);
      return;
    }

    // Верификация решения через умный грейдер
    if (type === 'VERIFY') {
      // 1. Выполняем запрос студента
      const userResult = runSqlTransaction(SQL, seedCode, userCode);

      // 2. Выполняем эталонный запрос
      const refCode = solutionCode || userCode;
      const refResult = runSqlTransaction(SQL, seedCode, refCode);

      // 3. Сверяем результаты через Smart Grader
      const grade = gradeSolution(
        userCode,
        userResult.columns,
        userResult.rows,
        refResult.columns,
        refResult.rows,
        testConfig
      );

      const resp: WorkerResponse = {
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
      };
      self.postMessage(resp);
      return;
    }
  } catch (err: unknown) {
    const translated = translateError(err as Error, 'sql');
    const resp: WorkerResponse = {
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
    };
    self.postMessage(resp);
  }
};
