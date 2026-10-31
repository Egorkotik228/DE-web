/**
 * DE ACADEMY — Менеджер изолированных Web Workers (Worker Manager)
 * Фоновый прелоад, статус ядра, жесткий таймаут 5000 мс и защита от зависаний
 */

import { EngineType, LessonTestConfig, WorkerRequest, WorkerResponse } from '@/types/course';
import { executeCode as fallbackExecuteCode } from './codeRunner';

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'running' | 'error' | 'timeout';

interface WorkerState {
  worker: Worker | null;
  status: EngineStatus;
  statusMessage: string;
  activeRequestId: string | null;
  timeoutTimer: NodeJS.Timeout | null;
  listeners: Set<(status: EngineStatus, message: string) => void>;
}

class WorkerManager {
  private workers: Map<string, WorkerState> = new Map();

  constructor() {
    this.initState('sql');
    this.initState('python');
  }

  private initState(engine: string) {
    if (!this.workers.has(engine)) {
      this.workers.set(engine, {
        worker: null,
        status: 'idle',
        statusMessage: 'Ядро не инициализировано',
        activeRequestId: null,
        timeoutTimer: null,
        listeners: new Set(),
      });
    }
  }

  /**
   * Подписка компонента на изменение статуса движка
   */
  public subscribe(
    engine: string,
    callback: (status: EngineStatus, message: string) => void
  ): () => void {
    const norm = this.normalizeEngine(engine);
    this.initState(norm);
    const state = this.workers.get(norm)!;
    state.listeners.add(callback);
    // Мгновенный вызов с текущим статусом
    callback(state.status, state.statusMessage);

    return () => {
      state.listeners.delete(callback);
    };
  }

  private notify(engine: string, status: EngineStatus, message: string) {
    const state = this.workers.get(engine);
    if (!state) return;
    state.status = status;
    state.statusMessage = message;
    state.listeners.forEach((cb) => cb(status, message));
  }

  private normalizeEngine(engine: string): 'sql' | 'python' {
    if (engine === 'sql' || engine === 'postgresql') return 'sql';
    return 'python'; // python, pandas, spark, schema-builder, cli
  }

  /**
   * Получение или создание экземпляра воркера
   */
  private getOrCreateWorker(engineType: 'sql' | 'python'): Worker | null {
    if (typeof window === 'undefined') return null;

    const state = this.workers.get(engineType)!;
    if (state.worker) return state.worker;

    try {
      const scriptUrl = engineType === 'sql' ? '/workers/sqlWorker.js' : '/workers/pythonWorker.js';
      const worker = new Worker(scriptUrl);

      worker.onerror = (e) => {
        console.error(`Ошибка в Web Worker [${engineType}]:`, e);
        this.notify(engineType, 'error', `Ошибка воркера: ${e.message || 'Сбой загрузки'}`);
      };

      state.worker = worker;
      return worker;
    } catch (err) {
      console.warn(`Не удалось создать Worker для ${engineType}:`, err);
      return null;
    }
  }

  /**
   * Принудительный перезапуск воркера при таймауте (5000 ms)
   */
  public terminateAndRespawn(engineType: 'sql' | 'python') {
    const state = this.workers.get(engineType);
    if (!state) return;

    if (state.timeoutTimer) {
      clearTimeout(state.timeoutTimer);
      state.timeoutTimer = null;
    }

    if (state.worker) {
      try {
        state.worker.terminate();
      } catch {
        // ignore
      }
      state.worker = null;
    }

    state.activeRequestId = null;
    this.notify(engineType, 'idle', 'Ядро перезапущено');

    // Пересоздаем в фоне
    setTimeout(() => {
      this.preloadEngine(engineType);
    }, 50);
  }

  /**
   * Фоновый Preload ядра
   */
  public async preloadEngine(rawEngine: string): Promise<void> {
    if (typeof window === 'undefined') return;

    const engineType = this.normalizeEngine(rawEngine);
    const state = this.workers.get(engineType)!;

    if (state.status === 'ready' || state.status === 'loading') return;

    this.notify(
      engineType,
      'loading',
      engineType === 'sql' ? '⚡ Загрузка ядра SQLite Wasm...' : '⚡ Загрузка ядра Pyodide / PySpark...'
    );

    const worker = this.getOrCreateWorker(engineType);
    if (!worker) {
      this.notify(engineType, 'ready', '🟢 Локальный симулятор готов');
      return;
    }

    const initReqId = `init_${Date.now()}`;
    state.activeRequestId = initReqId;

    return new Promise((resolve) => {
      const onInitMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.requestId === initReqId) {
          worker.removeEventListener('message', onInitMessage);
          this.notify(
            engineType,
            'ready',
            engineType === 'sql' ? '🟢 Ядро готово (SQLite 3 Wasm)' : '🟢 Ядро готово (Python 3.11 / PySpark)'
          );
          resolve();
        }
      };

      worker.addEventListener('message', onInitMessage);

      // Таймаут инициализации (15 секунд для тяжелого Pyodide)
      setTimeout(() => {
        if (state.status === 'loading') {
          this.notify(
            engineType,
            'ready',
            engineType === 'sql' ? '🟢 Ядро готово (SQLite 3 Wasm)' : '🟢 Ядро готово (Python 3.11)'
          );
          resolve();
        }
      }, 15000);

      const req: WorkerRequest = {
        requestId: initReqId,
        type: 'INIT',
        seedCode: '',
        userCode: '',
      };
      worker.postMessage(req);
    });
  }

  /**
   * Исполнение кода внутри воркера с защитой 5000 ms
   */
  public execute(
    rawEngine: EngineType | string,
    type: 'RUN' | 'VERIFY',
    seedCode: string,
    userCode: string,
    solutionCode?: string,
    testConfig?: LessonTestConfig
  ): Promise<WorkerResponse> {
    const engineType = this.normalizeEngine(rawEngine);
    const state = this.workers.get(engineType)!;
    const worker = this.getOrCreateWorker(engineType);

    // Если воркер недоступен, фоллбэк на симулятор
    if (!worker) {
      return Promise.resolve(
        fallbackExecuteCode(userCode, {
          id: 'temp',
          moduleSlug: rawEngine,
          order: 1,
          title: 'Lesson',
          estimatedMinutes: 10,
          theoryBlocks: [],
          glossaryTerms: [],
          schemaPreview: [],
          taskDescription: '',
          seedCode,
          initialCode: userCode,
          solutionCode: solutionCode || userCode,
          testConfig: testConfig || { checkOrder: false, floatPrecision: 2 },
          brokenProdTask: {
            title: '',
            incidentDescription: '',
            buggyCode: '',
            fixHint: '',
            solutionCode: solutionCode || userCode,
            testConfig: testConfig || { checkOrder: false, floatPrecision: 2 },
          },
          hints: ['', '', ''],
        }, false, type === 'VERIFY')
      );
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    state.activeRequestId = requestId;
    this.notify(engineType, 'running', '▶ Выполнение запроса...');

    return new Promise((resolve) => {
      let isResolved = false;

      // 4. ЖЕСТКИЙ ТАЙМАУТ 5 СЕКУНД (Защита от while True и CROSS JOIN)
      state.timeoutTimer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          this.terminateAndRespawn(engineType);

          const timeoutResp: WorkerResponse = {
            requestId,
            status: 'TIMEOUT',
            executionTimeMs: 5000,
            columns: ['status'],
            rows: [['Превышен лимит времени выполнения (5000 мс)']],
            errorDetails: {
              friendlyMessage:
                '⏱ Превышен лимит времени (5 сек): код выполнялся слишком долго. Проверьте бесконечные циклы или неоптимальный CROSS JOIN.',
              rawError: 'Execution timeout: Worker exceeded 5000ms limit.',
            },
            verification: {
              passed: false,
              feedback:
                '⏱ Превышен лимит времени (5 сек): код выполнялся слишком долго. Проверьте бесконечные циклы или неоптимальный CROSS JOIN.',
            },
          };
          resolve(timeoutResp);
        }
      }, 5000);

      const messageHandler = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.requestId === requestId) {
          if (!isResolved) {
            isResolved = true;
            if (state.timeoutTimer) {
              clearTimeout(state.timeoutTimer);
              state.timeoutTimer = null;
            }
            worker.removeEventListener('message', messageHandler);

            this.notify(
              engineType,
              'ready',
              engineType === 'sql' ? '🟢 Ядро готово (SQLite 3 Wasm)' : '🟢 Ядро готово (Python 3.11)'
            );
            resolve(event.data);
          }
        }
      };

      worker.addEventListener('message', messageHandler);

      // Отправка задания в воркер
      worker.postMessage({
        requestId,
        type,
        seedCode,
        userCode,
        solutionCode,
        testConfig,
      });
    });
  }
}

// Экспорт синглтона WorkerManager
export const workerManager = new WorkerManager();
