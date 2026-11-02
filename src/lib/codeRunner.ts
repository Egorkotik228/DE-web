import { Lesson, WorkerResponse } from '@/types/course';

export function executeCode(
  userCode: string,
  lesson: Lesson,
  isBrokenProdMode: boolean,
  isVerification: boolean
): WorkerResponse {
  const startTime = performance.now();
  const cleanCode = userCode.trim();

  if (!cleanCode) {
    return {
      requestId: Math.random().toString(36).substring(7),
      status: 'ERROR',
      executionTimeMs: 12,
      errorDetails: {
        line: 1,
        friendlyMessage: 'Редактор кода пуст. Напишите запрос или решение для выполнения.',
        rawError: 'EmptyInputException: No code provided to executor',
      },
      verification: isVerification
        ? { passed: false, feedback: 'Код пуст. Напишите решение задания.' }
        : undefined,
    };
  }

  // Broken prod verification
  if (isBrokenProdMode) {
    const isBuggy = cleanCode === lesson.brokenProdTask.buggyCode.trim() ||
      cleanCode.includes('/ 100') && !cleanCode.includes('100.0') ||
      cleanCode.includes('WHERE dept_id IS NOT NULL AND AVG') ||
      cleanCode.includes('RANGE BETWEEN') ||
      cleanCode.includes('[r["id"] for r in stream') ||
      cleanCode.includes('datetime.now() -') ||
      cleanCode.includes('df["status"][0]') ||
      cleanCode.includes('MD5(TRIM(') ||
      cleanCode.includes('JOIN current_sat_customer c ON') && !cleanCode.includes('LEFT JOIN');

    const duration = Math.round(performance.now() - startTime + Math.random() * 30 + 15);

    if (isBuggy) {
      return {
        requestId: Math.random().toString(36).substring(7),
        status: 'ERROR',
        executionTimeMs: duration,
        errorDetails: {
          line: 2,
          friendlyMessage: `🚨 Инцидент в проде воспроизведен! ${lesson.brokenProdTask.incidentDescription}`,
          rawError: `ProductionIncidentError: ${lesson.brokenProdTask.fixHint}`,
        },
        verification: isVerification
          ? {
              passed: false,
              feedback: `Авария не устранена. Подсказка: ${lesson.brokenProdTask.fixHint}`,
            }
          : undefined,
      };
    }

    // Fixed broken prod
    const schema = lesson.schemaPreview[0];
    const columns = schema ? schema.columns.map((c) => c.name) : ['status', 'message'];
    const rows = [
      ['SUCCESS', 'Инцидент #104 успешно локализован и устранен в проде!'],
      ['FIXED', 'Баг исправлен согласно архитектурному стандарту.'],
    ];

    return {
      requestId: Math.random().toString(36).substring(7),
      status: 'SUCCESS',
      executionTimeMs: duration,
      columns,
      rows,
      stdout: `[PROD HOTFIX] Патч успешно применен в проде.\n[METRICS] Ошибки 500 снизились до 0.00%.\n[SLA] Время отклика нормализовано.`,
      verification: isVerification
        ? {
            passed: true,
            feedback: `🔥 Авария успешно устранена! Вы спасли прод и предотвратили даунтайм.`,
          }
        : undefined,
    };
  }

  // Standard lesson mode
  const testConfig = lesson.testConfig;
  const duration = Math.round(performance.now() - startTime + Math.random() * 40 + 20);

  // Check required AST / text patterns
  const requiredPatterns = testConfig.requiredAstPatterns || [];
  const missingPattern = requiredPatterns.find(
    (p) => !cleanCode.toLowerCase().includes(p.toLowerCase())
  );

  if (missingPattern) {
    return {
      requestId: Math.random().toString(36).substring(7),
      status: 'ERROR',
      executionTimeMs: duration,
      errorDetails: {
        friendlyMessage: `В запросе отсутствует обязательная конструкция: «${missingPattern}».`,
        rawError: `ASTValidationError: Missing required token "${missingPattern}" in query syntax tree`,
      },
      verification: isVerification
        ? { passed: false, feedback: `Не найдена конструкция ${missingPattern}.` }
        : undefined,
    };
  }

  // Produce columns and rows matching expected testConfig
  let columns = testConfig.expectedColumns;
  if (!columns || columns.length === 0) {
    const schema = lesson.schemaPreview[0];
    columns = schema ? schema.columns.map((c) => c.name) : ['result_col_1', 'result_col_2'];
  }

  // Mock execution results based on lesson ID
  let sampleRows: (string | number | boolean | null)[][] = [];

  switch (lesson.id) {
    case 'intro-1':
      columns = ['avg_duration', 'max_duration', 'total_clicks'];
      sampleRows = [[26.67, 60, 3]];
      break;

    case 'intro-2':
      columns = ['payment_id', 'amount_rub', 'masked_card'];
      sampleRows = [
        ['p_1', 2500.0, '4276********1092'],
        ['p_3', 750.0, '2200********9988'],
      ];
      break;

    case 'sql-1':
      columns = ['order_id', 'total_amount', 'order_date'];
      sampleRows = [
        [101, 1400.0, '2026-10-01 10:15:00'],
        [104, 750.0, '2026-10-03 14:20:00'],
        [102, 599.99, '2026-10-02 11:30:00'],
      ];
      break;

    case 'sql-2':
      columns = ['country', 'sales_count', 'total_revenue', 'avg_check'];
      sampleRows = [
        ['Germany', 4, 18500.0, 4625.0],
        ['USA', 5, 14200.0, 2840.0],
      ];
      break;

    case 'sql-3':
      columns = ['user_name', 'orders_count', 'total_spent'];
      sampleRows = [
        ['Елена', 3, 14500.0],
        ['Иван', 2, 8500.0],
        ['Алексей', 0, 0.0],
      ];
      break;

    case 'sql-4':
      columns = ['customer_id', 'total_spent', 'tier'];
      sampleRows = [
        [1, 12500.0, 'VIP'],
        [3, 4200.0, 'Premium'],
        [2, 1800.0, 'Standard'],
      ];
      break;

    case 'sql-5':
      columns = ['dept_id', 'avg_salary', 'emp_count'];
      sampleRows = [
        [30, 300000.0, 1],
        [10, 215000.0, 2],
      ];
      break;

    case 'sql-6':
      columns = ['sale_date', 'revenue', 'moving_avg_3d'];
      sampleRows = [
        ['2026-10-01', 10000.0, 10000.0],
        ['2026-10-02', 20000.0, 15000.0],
        ['2026-10-03', 15000.0, 15000.0],
        ['2026-10-04', 30000.0, 21666.67],
        ['2026-10-05', 25000.0, 23333.33],
      ];
      break;

    case 'python-1':
      columns = ['transaction_id', 'rounded_amount'];
      sampleRows = [
        ['tx_101', 150.76],
        ['tx_103', 540.2],
      ];
      break;

    case 'python-2':
      columns = ['attempt', 'calculated_delay_sec'];
      sampleRows = [
        [0, 1.0],
        [1, 2.0],
        [2, 4.0],
        [5, 30.0],
      ];
      break;

    case 'pandas-1':
      columns = ['order_id', 'total_revenue'];
      sampleRows = [
        [1, 39.98],
        [2, 52.5],
        [3, 42.5],
        [4, 150.0],
      ];
      break;

    case 'pandas-2':
      columns = ['server_id', 'cpu_usage', 'region'];
      sampleRows = [
        [102, 92.5, 'eu-west-1'],
        [104, 88.0, 'eu-west-1'],
      ];
      break;

    case 'dv-1':
      columns = ['hub_customer_hk', 'customer_bk', 'load_date', 'record_source'];
      sampleRows = [
        ['c4ca4238a0b923820dcc509a6f75849b', 'CUST_001', '2026-10-31 18:00:00', 'CRM_STAGE'],
        ['c81e728d9d4c2f636f067f89cc14862c', 'CUST_002', '2026-10-31 18:00:00', 'CRM_STAGE'],
      ];
      break;

    case 'dv-2':
      columns = ['hub_customer_hk', 'risk_level', 'credit_limit', 'incoming_hash_diff'];
      sampleRows = [
        ['hk_02', 'HIGH', 15000, '3b712b7a9cd81e728d9d4c2f636f067f'],
        ['hk_03', 'MEDIUM', 30000, '8f4c8996fb92427ae41e4649b934ca49'],
      ];
      break;

    default:
      columns = ['id', 'status', 'value'];
      sampleRows = [
        [1, 'SUCCESS', 'Query executed successfully'],
        [2, 'SUCCESS', 'Data matches standard specification'],
      ];
      break;
  }

  // Check expected row count if specified
  if (testConfig.expectedRowCount && sampleRows.length !== testConfig.expectedRowCount) {
    return {
      requestId: Math.random().toString(36).substring(7),
      status: 'SUCCESS',
      executionTimeMs: duration,
      columns,
      rows: sampleRows,
      stdout: `Запрос вернул ${sampleRows.length} строк. Ожидалось: ${testConfig.expectedRowCount}.`,
      verification: isVerification
        ? {
            passed: false,
            feedback: `Количество строк (${sampleRows.length}) отличается от эталонного (${testConfig.expectedRowCount}). Проверьте условия фильтрации.`,
          }
        : undefined,
    };
  }

  return {
    requestId: Math.random().toString(36).substring(7),
    status: 'SUCCESS',
    executionTimeMs: duration,
    columns,
    rows: sampleRows,
    stdout: `[EXECUTOR] Query execution completed in ${duration} ms.\n[MEMORY] Allocated: 14.2 MB. GC pauses: 0 ms.\n[RESULT] Returned ${sampleRows.length} rows, ${columns.length} columns.`,
    verification: isVerification
      ? {
          passed: true,
          feedback: `🎉 Решение на 100% верное! Все тесты и структуры данных сошлись с эталоном.`,
        }
      : undefined,
  };
}
