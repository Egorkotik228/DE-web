/**
 * DE ACADEMY — WebAssembly Python Worker (Stand-alone Worker Script)
 */

let pyodideInstance = null;

const PYODIDE_CDN_1 = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

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

function translatePyError(rawError) {
  const errorText = String(rawError);
  let friendlyMessage = 'Ошибка при выполнении кода Python.';

  if (/KeyError:\s*['"]?([^'"\n]+)['"]?/i.test(errorText)) {
    const match = errorText.match(/KeyError:\s*['"]?([^'"\n]+)['"]?/i);
    friendlyMessage = `Ошибка ключа (KeyError): колонка «${match ? match[1] : ''}» отсутствует в DataFrame. Проверьте точное имя колонки, регистр букв и отсутствие лишних пробелов.`;
  } else if (/NameError:\s*name\s*['"]([^'"]+)['"]\s*is not defined/i.test(errorText)) {
    const match = errorText.match(/NameError:\s*name\s*['"]([^'"]+)['"]\s*is not defined/i);
    const name = match ? match[1] : '';
    if (name === 'F') {
      friendlyMessage = `Переменная «F» не определена. В PySpark добавьте импорт: «from pyspark.sql import functions as F».`;
    } else if (name === 'Window') {
      friendlyMessage = `Класс «Window» не определен. В PySpark добавьте импорт: «from pyspark.sql.window import Window».`;
    } else {
      friendlyMessage = `Переменная или функция «${name}» не объявлена. Проверьте опечатки в названии.`;
    }
  } else if (/IndentationError:\s*(.+)/i.test(errorText)) {
    friendlyMessage = `Ошибка отступов (IndentationError). В Python отступы определяют структуру кода. Используйте ровно 4 пробела для каждого блока.`;
  } else if (/SyntaxError:\s*(.+)/i.test(errorText)) {
    friendlyMessage = `Синтаксическая ошибка Python. Проверьте двоеточия после if/def/for, парные кавычки и закрывающие скобки.`;
  } else if (/AttributeError:\s*['"]?([^'"\n]+)['"]?\s*object has no attribute\s*['"]?([^'"\n]+)['"]?/i.test(errorText)) {
    const match = errorText.match(/AttributeError:\s*['"]?([^'"\n]+)['"]?\s*object has no attribute\s*['"]?([^'"\n]+)['"]?/i);
    friendlyMessage = `У объекта отсутствует атрибут или метод «${match ? match[2] : ''}».`;
  } else if (/ZeroDivisionError/i.test(errorText)) {
    friendlyMessage = `Деление на ноль (ZeroDivisionError). Защитите формулу через проверку или NULL.`;
  } else {
    friendlyMessage = `Ошибка Python: ${errorText}`;
  }

  return { friendlyMessage, rawError: errorText };
}

async function getOrInitPyodide() {
  if (pyodideInstance) return pyodideInstance;

  if (typeof self.loadPyodide !== 'function') {
    self.importScripts(PYODIDE_CDN_1);
  }

  const pyodide = await self.loadPyodide({
    indexURL: PYODIDE_INDEX_URL,
  });

  await pyodide.loadPackage(['pandas', 'numpy']);

  const pysparkInitCode = `
import sys
import types
import numpy as np
import pandas as pd

_SPARK_CATALOG = {}

class Column:
    def __init__(self, expr_fn, name=None):
        self.expr_fn = expr_fn
        self.name = name
        self.is_window = False
        self.window_spec = None

    def __call__(self, df):
        return self.expr_fn(df)

    def alias(self, new_name):
        new_col = Column(self.expr_fn, name=new_name)
        new_col.is_window = self.is_window
        new_col.window_spec = self.window_spec
        return new_col

    def __eq__(self, other):
        return Column(lambda df: (self(df) == (other(df) if isinstance(other, Column) else other)))
    def __ne__(self, other):
        return Column(lambda df: (self(df) != (other(df) if isinstance(other, Column) else other)))
    def __lt__(self, other):
        return Column(lambda df: (self(df) < (other(df) if isinstance(other, Column) else other)))
    def __le__(self, other):
        return Column(lambda df: (self(df) <= (other(df) if isinstance(other, Column) else other)))
    def __gt__(self, other):
        return Column(lambda df: (self(df) > (other(df) if isinstance(other, Column) else other)))
    def __ge__(self, other):
        return Column(lambda df: (self(df) >= (other(df) if isinstance(other, Column) else other)))

    def __add__(self, other):
        return Column(lambda df: (self(df) + (other(df) if isinstance(other, Column) else other)))
    def __sub__(self, other):
        return Column(lambda df: (self(df) - (other(df) if isinstance(other, Column) else other)))
    def __mul__(self, other):
        return Column(lambda df: (self(df) * (other(df) if isinstance(other, Column) else other)))
    def __truediv__(self, other):
        return Column(lambda df: (self(df) / (other(df) if isinstance(other, Column) else other)))

    def __and__(self, other):
        return Column(lambda df: (self(df) & (other(df) if isinstance(other, Column) else other)))
    def __or__(self, other):
        return Column(lambda df: (self(df) | (other(df) if isinstance(other, Column) else other)))
    def __invert__(self):
        return Column(lambda df: (~self(df)))

    def isNull(self):
        return Column(lambda df: self(df).isna())
    def isNotNull(self):
        return Column(lambda df: self(df).notna())
    def isin(self, *values):
        val_list = values[0] if (len(values) == 1 and isinstance(values[0], (list, tuple, set))) else list(values)
        return Column(lambda df: self(df).isin(val_list))

    def asc(self):
        self.ascending = True
        return self
    def desc(self):
        self.ascending = False
        return self

    def over(self, window_spec):
        new_col = Column(self.expr_fn, name=self.name)
        new_col.is_window = True
        new_col.window_spec = window_spec
        return new_col


class WindowSpec:
    def __init__(self, partition_cols=None, order_cols=None, ascending_list=None):
        self.partition_cols = partition_cols or []
        self.order_cols = order_cols or []
        self.ascending_list = ascending_list or []

    def partitionBy(self, *cols):
        p_cols = cols[0] if (len(cols) == 1 and isinstance(cols[0], (list, tuple))) else list(cols)
        clean_p = [c if isinstance(c, str) else getattr(c, 'name', str(c)) for c in p_cols]
        return WindowSpec(clean_p, self.order_cols, self.ascending_list)

    def orderBy(self, *cols):
        o_cols = cols[0] if (len(cols) == 1 and isinstance(cols[0], (list, tuple))) else list(cols)
        clean_o = []
        asc_list = []
        for c in o_cols:
            if isinstance(c, Column):
                clean_o.append(c.name or 'col')
                asc_list.append(getattr(c, 'ascending', True))
            else:
                clean_o.append(str(c))
                asc_list.append(True)
        return WindowSpec(self.partition_cols, clean_o, asc_list)


class Window:
    @staticmethod
    def partitionBy(*cols):
        return WindowSpec().partitionBy(*cols)
    @staticmethod
    def orderBy(*cols):
        return WindowSpec().orderBy(*cols)


class PySparkFunctions:
    @staticmethod
    def col(name):
        return Column(lambda df: df[name], name=name)
    @staticmethod
    def lit(val):
        return Column(lambda df: val)
    @staticmethod
    def when(condition, value):
        class WhenBuilder:
            def __init__(self, conditions, values, default=None):
                self.conditions = conditions
                self.values = values
                self.default = default
            def when(self, cond, val):
                return WhenBuilder(self.conditions + [cond], self.values + [val], self.default)
            def otherwise(self, default_val):
                b = WhenBuilder(self.conditions, self.values, default_val)
                def eval_when(df):
                    cond_arrs = [c(df) if isinstance(c, Column) else c for c in b.conditions]
                    val_arrs = [v(df) if isinstance(v, Column) else v for v in b.values]
                    def_val = b.default(df) if isinstance(b.default, Column) else b.default
                    return np.select(cond_arrs, val_arrs, default=def_val)
                return Column(eval_when)
        return WhenBuilder([condition], [value])

    @staticmethod
    def coalesce(*cols):
        def eval_coalesce(df):
            res = None
            for c in cols:
                s = c(df) if isinstance(c, Column) else df[c]
                res = s if res is None else res.combine_first(s)
            return res
        return Column(eval_coalesce)

    @staticmethod
    def sum(col):
        name = col.name if isinstance(col, Column) else col
        return Column(lambda df: df[name].sum(), name=f"sum({name})")
    @staticmethod
    def avg(col):
        name = col.name if isinstance(col, Column) else col
        return Column(lambda df: df[name].mean(), name=f"avg({name})")
    @staticmethod
    def mean(col):
        return PySparkFunctions.avg(col)
    @staticmethod
    def count(col):
        name = col.name if isinstance(col, Column) else col
        if str(name) == '*':
            return Column(lambda df: len(df), name="count(1)")
        return Column(lambda df: df[name].count(), name=f"count({name})")
    @staticmethod
    def min(col):
        name = col.name if isinstance(col, Column) else col
        return Column(lambda df: df[name].min(), name=f"min({name})")
    @staticmethod
    def max(col):
        name = col.name if isinstance(col, Column) else col
        return Column(lambda df: df[name].max(), name=f"max({name})")

    @staticmethod
    def upper(col):
        name = col.name if isinstance(col, Column) else col
        return Column(lambda df: df[name].astype(str).str.upper(), name=f"upper({name})")
    @staticmethod
    def lower(col):
        name = col.name if isinstance(col, Column) else col
        return Column(lambda df: df[name].astype(str).str.lower(), name=f"lower({name})")
    @staticmethod
    def trim(col):
        name = col.name if isinstance(col, Column) else col
        return Column(lambda df: df[name].astype(str).str.strip(), name=f"trim({name})")

    @staticmethod
    def concat(*cols):
        def eval_concat(df):
            series_list = [(c(df) if isinstance(c, Column) else df[c]).astype(str) for c in cols]
            res = series_list[0]
            for s in series_list[1:]:
                res = res + s
            return res
        return Column(eval_concat)

    @staticmethod
    def row_number():
        def eval_row_number(df, spec):
            sorted_df = df.copy()
            orig_idx = sorted_df.index
            if spec and spec.order_cols:
                sorted_df = sorted_df.sort_values(by=spec.order_cols, ascending=spec.ascending_list)
            if spec and spec.partition_cols:
                rn = sorted_df.groupby(spec.partition_cols).cumcount() + 1
            else:
                rn = np.arange(1, len(sorted_df) + 1)
            sorted_df['_rn'] = rn
            return sorted_df.loc[orig_idx, '_rn']
        col = Column(lambda df: eval_row_number(df, None), name="row_number")
        col._eval_window = eval_row_number
        return col

    @staticmethod
    def rank():
        def eval_rank(df, spec):
            sorted_df = df.copy()
            orig_idx = sorted_df.index
            if spec and spec.order_cols:
                sorted_df = sorted_df.sort_values(by=spec.order_cols, ascending=spec.ascending_list)
            if spec and spec.partition_cols and spec.order_cols:
                ranked = sorted_df.groupby(spec.partition_cols)[spec.order_cols[0]].rank(method='min')
            elif spec and spec.order_cols:
                ranked = sorted_df[spec.order_cols[0]].rank(method='min')
            else:
                ranked = pd.Series(1, index=sorted_df.index)
            sorted_df['_rank'] = ranked.astype(int)
            return sorted_df.loc[orig_idx, '_rank']
        col = Column(lambda df: eval_rank(df, None), name="rank")
        col._eval_window = eval_rank
        return col

    @staticmethod
    def dense_rank():
        def eval_dense_rank(df, spec):
            sorted_df = df.copy()
            orig_idx = sorted_df.index
            if spec and spec.order_cols:
                sorted_df = sorted_df.sort_values(by=spec.order_cols, ascending=spec.ascending_list)
            if spec and spec.partition_cols and spec.order_cols:
                ranked = sorted_df.groupby(spec.partition_cols)[spec.order_cols[0]].rank(method='dense')
            elif spec and spec.order_cols:
                ranked = sorted_df[spec.order_cols[0]].rank(method='dense')
            else:
                ranked = pd.Series(1, index=sorted_df.index)
            sorted_df['_dr'] = ranked.astype(int)
            return sorted_df.loc[orig_idx, '_dr']
        col = Column(lambda df: eval_dense_rank(df, None), name="dense_rank")
        col._eval_window = eval_dense_rank
        return col

    @staticmethod
    def lag(col, offset=1, default=None):
        name = col.name if isinstance(col, Column) else col
        def eval_lag(df, spec):
            sorted_df = df.copy()
            orig_idx = sorted_df.index
            if spec and spec.order_cols:
                sorted_df = sorted_df.sort_values(by=spec.order_cols, ascending=spec.ascending_list)
            if spec and spec.partition_cols:
                res = sorted_df.groupby(spec.partition_cols)[name].shift(offset)
            else:
                res = sorted_df[name].shift(offset)
            if default is not None:
                res = res.fillna(default)
            sorted_df['_lag'] = res
            return sorted_df.loc[orig_idx, '_lag']
        col_obj = Column(lambda df: eval_lag(df, None), name=f"lag({name})")
        col_obj._eval_window = eval_lag
        return col_obj

    @staticmethod
    def lead(col, offset=1, default=None):
        name = col.name if isinstance(col, Column) else col
        def eval_lead(df, spec):
            sorted_df = df.copy()
            orig_idx = sorted_df.index
            if spec and spec.order_cols:
                sorted_df = sorted_df.sort_values(by=spec.order_cols, ascending=spec.ascending_list)
            if spec and spec.partition_cols:
                res = sorted_df.groupby(spec.partition_cols)[name].shift(-offset)
            else:
                res = sorted_df[name].shift(-offset)
            if default is not None:
                res = res.fillna(default)
            sorted_df['_lead'] = res
            return sorted_df.loc[orig_idx, '_lead']
        col_obj = Column(lambda df: eval_lead(df, None), name=f"lead({name})")
        col_obj._eval_window = eval_lead
        return col_obj


F = PySparkFunctions


class PySparkGroupedData:
    def __init__(self, df, group_cols):
        self.df = df
        self.group_cols = group_cols

    def agg(self, *exprs):
        if len(exprs) == 1 and isinstance(exprs[0], dict):
            res_df = self.df._df.groupby(self.group_cols, as_index=False).agg(exprs[0])
            return PySparkDataFrame(res_df)
        agg_dict = {}
        for exp in exprs:
            if isinstance(exp, Column):
                agg_dict[exp.name] = 'sum'
            elif isinstance(exp, str):
                agg_dict[exp] = 'first'
        res_df = self.df._df.groupby(self.group_cols, as_index=False).agg(agg_dict)
        return PySparkDataFrame(res_df)

    def count(self):
        res = self.df._df.groupby(self.group_cols, as_index=False).size().rename(columns={'size': 'count'})
        return PySparkDataFrame(res)

    def sum(self, *cols):
        res = self.df._df.groupby(self.group_cols, as_index=False)[list(cols)].sum()
        return PySparkDataFrame(res)

    def avg(self, *cols):
        res = self.df._df.groupby(self.group_cols, as_index=False)[list(cols)].mean()
        return PySparkDataFrame(res)


class PySparkDataFrame:
    def __init__(self, data=None, schema=None):
        if isinstance(data, pd.DataFrame):
            self._df = data.copy()
        elif isinstance(data, list):
            self._df = pd.DataFrame(data, columns=schema)
        else:
            self._df = pd.DataFrame()

    def filter(self, condition):
        if isinstance(condition, Column):
            return PySparkDataFrame(self._df[condition(self._df)])
        elif isinstance(condition, str):
            return PySparkDataFrame(self._df.query(condition))
        return self

    def where(self, condition):
        return self.filter(condition)

    def select(self, *cols):
        col_list = cols[0] if (len(cols) == 1 and isinstance(cols[0], (list, tuple))) else list(cols)
        new_df = pd.DataFrame(index=self._df.index)
        for c in col_list:
            if isinstance(c, Column):
                col_name = c.name or 'col'
                if getattr(c, 'is_window', False) and hasattr(c, '_eval_window'):
                    new_df[col_name] = c._eval_window(self._df, c.window_spec)
                else:
                    new_df[col_name] = c(self._df)
            elif isinstance(c, str):
                if c == '*':
                    new_df = self._df.copy()
                else:
                    new_df[c] = self._df[c]
        return PySparkDataFrame(new_df)

    def withColumn(self, col_name, col_expr):
        new_df = self._df.copy()
        if isinstance(col_expr, Column):
            if getattr(col_expr, 'is_window', False) and hasattr(col_expr, '_eval_window'):
                new_df[col_name] = col_expr._eval_window(new_df, col_expr.window_spec)
            else:
                new_df[col_name] = col_expr(new_df)
        elif callable(col_expr):
            new_df[col_name] = col_expr(new_df)
        else:
            new_df[col_name] = col_expr
        return PySparkDataFrame(new_df)

    def withColumnRenamed(self, existing, new):
        return PySparkDataFrame(self._df.rename(columns={existing: new}))

    def drop(self, *cols):
        col_list = cols[0] if (len(cols) == 1 and isinstance(cols[0], (list, tuple))) else list(cols)
        return PySparkDataFrame(self._df.drop(columns=col_list, errors='ignore'))

    def groupBy(self, *cols):
        col_list = cols[0] if (len(cols) == 1 and isinstance(cols[0], (list, tuple))) else list(cols)
        clean = [c if isinstance(c, str) else c.name for c in col_list]
        return PySparkGroupedData(self, clean)

    def join(self, other, on=None, how='inner'):
        other_df = other._df if isinstance(other, PySparkDataFrame) else other
        res = pd.merge(self._df, other_df, on=on, how=how)
        return PySparkDataFrame(res)

    def orderBy(self, *cols, **kwargs):
        col_list = cols[0] if (len(cols) == 1 and isinstance(cols[0], (list, tuple))) else list(cols)
        by_cols = []
        asc_list = []
        for c in col_list:
            if isinstance(c, Column):
                by_cols.append(c.name)
                asc_list.append(getattr(c, 'ascending', True))
            else:
                by_cols.append(c)
                asc_list.append(True)
        return PySparkDataFrame(self._df.sort_values(by=by_cols, ascending=asc_list))

    def sort(self, *cols, **kwargs):
        return self.orderBy(*cols, **kwargs)

    def distinct(self):
        return PySparkDataFrame(self._df.drop_duplicates())

    def dropDuplicates(self, subset=None):
        return PySparkDataFrame(self._df.drop_duplicates(subset=subset))

    def limit(self, n):
        return PySparkDataFrame(self._df.head(n))

    def toPandas(self):
        return self._df.copy()

    def show(self, n=20, truncate=True):
        print(self._df.head(n).to_string(index=False))

    def count(self):
        return len(self._df)

    @property
    def columns(self):
        return list(self._df.columns)


class SparkSession:
    class Builder:
        def appName(self, name): return self
        def master(self, m): return self
        def config(self, k, v): return self
        def getOrCreate(self): return SparkSession._instance

    builder = Builder()
    _instance = None

    def __init__(self):
        SparkSession._instance = self

    def createDataFrame(self, data, schema=None):
        return PySparkDataFrame(data, schema)

    def table(self, table_name):
        if table_name in _SPARK_CATALOG:
            return PySparkDataFrame(_SPARK_CATALOG[table_name])
        raise KeyError(f"Table '{table_name}' not found in spark catalog.")

    @property
    def read(self):
        class Reader:
            def table(self_r, name): return SparkSession._instance.table(name)
            def csv(self_r, path, **kwargs): return PySparkDataFrame(pd.read_csv(path, **kwargs))
        return Reader()


spark = SparkSession()

pyspark_mod = types.ModuleType("pyspark")
pyspark_sql = types.ModuleType("pyspark.sql")
pyspark_sql_functions = types.ModuleType("pyspark.sql.functions")
pyspark_sql_window = types.ModuleType("pyspark.sql.window")

pyspark_sql.SparkSession = SparkSession
pyspark_sql.DataFrame = PySparkDataFrame
pyspark_sql.functions = F
pyspark_sql.Window = Window

pyspark_sql_functions.col = F.col
pyspark_sql_functions.lit = F.lit
pyspark_sql_functions.when = F.when
pyspark_sql_functions.coalesce = F.coalesce
pyspark_sql_functions.sum = F.sum
pyspark_sql_functions.avg = F.avg
pyspark_sql_functions.mean = F.mean
pyspark_sql_functions.count = F.count
pyspark_sql_functions.min = F.min
pyspark_sql_functions.max = F.max
pyspark_sql_functions.upper = F.upper
pyspark_sql_functions.lower = F.lower
pyspark_sql_functions.trim = F.trim
pyspark_sql_functions.concat = F.concat
pyspark_sql_functions.row_number = F.row_number
pyspark_sql_functions.rank = F.rank
pyspark_sql_functions.dense_rank = F.dense_rank
pyspark_sql_functions.lag = F.lag
pyspark_sql_functions.lead = F.lead

pyspark_sql_window.Window = Window

sys.modules["pyspark"] = pyspark_mod
sys.modules["pyspark.sql"] = pyspark_sql
sys.modules["pyspark.sql.functions"] = pyspark_sql_functions
sys.modules["pyspark.sql.window"] = pyspark_sql_window
`;

  await pyodide.runPythonAsync(pysparkInitCode);
  pyodideInstance = pyodide;
  return pyodideInstance;
}

async function runPythonSession(pyodide, seedCode, userCode) {
  const runnerScript = `
import sys
import io
import json
import pandas as pd
from pyspark.sql import PySparkDataFrame

_local_scope = {
    'spark': spark,
    'F': F,
    'Window': Window,
    'pd': pd,
    'np': np,
}

_stdout_buffer = io.StringIO()
sys.stdout = _stdout_buffer

if """${seedCode.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"')}".strip():
    exec("""${seedCode.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"')}\""", _local_scope)

_user_code = """${userCode.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"')}\"""
exec(_user_code, _local_scope)

sys.stdout = sys.__stdout__
_captured_stdout = _stdout_buffer.getvalue()

_target_df = None
for _var_name in ['result', 'df', 'res', 'final_df', 'out', 'output']:
    if _var_name in _local_scope:
        val = _local_scope[_var_name]
        if isinstance(val, PySparkDataFrame):
            _target_df = val.toPandas()
            break
        elif isinstance(val, pd.DataFrame):
            _target_df = val
            break

if _target_df is None:
    for k, v in reversed(list(_local_scope.items())):
        if k.startswith('_'): continue
        if isinstance(v, PySparkDataFrame):
            _target_df = v.toPandas()
            break
        elif isinstance(v, pd.DataFrame):
            _target_df = v
            break

_cols = []
_rows = []
if _target_df is not None:
    _cols = [str(c) for c in _target_df.columns]
    _rows = json.loads(_target_df.to_json(orient='values', date_format='iso'))

json.dumps({
    'columns': _cols,
    'rows': _rows,
    'stdout': _captured_stdout
})
`;

  const start = performance.now();
  const rawJson = await pyodide.runPythonAsync(runnerScript);
  const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;

  const parsed = JSON.parse(rawJson);
  return {
    columns: parsed.columns,
    rows: sanitizeRows(parsed.rows),
    stdout: parsed.stdout,
    executionTimeMs,
  };
}

self.onmessage = async (event) => {
  const { requestId, type, seedCode, userCode, solutionCode, testConfig } = event.data;

  try {
    const pyodide = await getOrInitPyodide();

    if (type === 'INIT') {
      self.postMessage({
        requestId,
        status: 'READY',
        executionTimeMs: 0,
        stdout: 'Pyodide Python 3.11 with Pandas and PySpark ready.',
      });
      return;
    }

    if (type === 'RUN') {
      const { columns, rows, stdout, executionTimeMs } = await runPythonSession(
        pyodide,
        seedCode,
        userCode
      );
      self.postMessage({
        requestId,
        status: 'SUCCESS',
        executionTimeMs,
        columns,
        rows,
        stdout: stdout || `Выполнено за ${executionTimeMs} мс.`,
      });
      return;
    }

    if (type === 'VERIFY') {
      const userRes = await runPythonSession(pyodide, seedCode, userCode);
      const refCode = solutionCode || userCode;
      const refRes = await runPythonSession(pyodide, seedCode, refCode);

      const grade = gradeSolution(
        userCode,
        userRes.columns,
        userRes.rows,
        refRes.columns,
        refRes.rows,
        testConfig
      );

      self.postMessage({
        requestId,
        status: grade.passed ? 'SUCCESS' : 'ERROR',
        executionTimeMs: userRes.executionTimeMs,
        columns: userRes.columns,
        rows: userRes.rows,
        stdout: userRes.stdout ? `${userRes.stdout}\n\n${grade.feedback}` : grade.feedback,
        verification: {
          passed: grade.passed,
          feedback: grade.feedback,
        },
      });
      return;
    }
  } catch (err) {
    const translated = translatePyError(err);
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
