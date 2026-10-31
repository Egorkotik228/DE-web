// DE Academy — Course Types Specification
// No `any` allowed — all interfaces are strictly typed.

export type EngineType =
  | 'sql'
  | 'python'
  | 'schema-builder'
  | 'cli'
  | 'validator'
  | 'system-design';

export type CalloutVariant = 'analogy' | 'prod-danger' | 'interview';

export type ERColumnKeyType = 'PK' | 'FK' | 'BK' | 'HK' | 'none';

export type ERTableRole =
  | 'hub'
  | 'link'
  | 'satellite'
  | 'dimension'
  | 'fact'
  | 'staging'
  | 'standard';

export interface ERColumn {
  name: string;
  type: string;
  keyType?: ERColumnKeyType;
  description?: string;
}

export interface ERTable {
  name: string;
  role?: ERTableRole;
  comment?: string;
  columns: ERColumn[];
}

export interface ERRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  cardinality: '1:1' | '1:N' | 'N:M';
  label?: string;
}

export interface ERDiagramData {
  title?: string;
  description?: string;
  tables: ERTable[];
  relationships: ERRelationship[];
}

export interface DataFlowNode {
  id: string;
  label: string;
  sublabel?: string;
  type: 'source' | 'transform' | 'storage' | 'consumer' | 'queue';
  status?: 'idle' | 'running' | 'success' | 'warning' | 'error';
  details?: string;
}

export interface DataFlowEdge {
  from: string;
  to: string;
  label?: string;
  animated?: boolean;
  throughput?: string;
}

export interface DataFlowData {
  title?: string;
  description?: string;
  nodes: DataFlowNode[];
  edges: DataFlowEdge[];
}

export interface BeforeAfterTableData {
  title?: string;
  beforeDescription: string;
  beforeColumns: string[];
  beforeRows: (string | number | boolean | null)[][];
  afterDescription: string;
  afterColumns: string[];
  afterRows: (string | number | boolean | null)[][];
  highlightDiffIndices?: { row: number; col: number }[];
}

export type TheoryBlock =
  | {
      type: 'markdown';
      content: string;
    }
  | {
      type: 'callout';
      variant: CalloutVariant;
      title: string;
      content: string;
    }
  | {
      type: 'er-diagram';
      data: ERDiagramData;
    }
  | {
      type: 'data-flow';
      data: DataFlowData;
    }
  | {
      type: 'before-after-table';
      data: BeforeAfterTableData;
    };

export interface InterviewQuestion {
  id: string;
  question: string;
  answer: string;
  level: 'Junior' | 'Middle' | 'Senior';
  tags?: string[];
}

export interface TrackModule {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  levelTitle: string;
  engineType: EngineType;
  dependencies: string[]; // Parent module IDs for SVG graph connectors
  totalLessons: number;
  curriculumTopics: string[];
  resumeBulletPoints: string[];
  cheatSheetMarkdown: string;
  interviewQuestions: InterviewQuestion[];
}

export interface LessonSchemaColumn {
  name: string;
  type: string;
  keyType?: 'PK' | 'FK' | 'BK' | 'HK' | 'INDEX';
}

export interface LessonSchemaPreview {
  tableName: string;
  description?: string;
  columns: LessonSchemaColumn[];
  sampleRows: Record<string, string | number | boolean | null>[];
}

export interface LessonTestConfig {
  checkOrder: boolean;
  floatPrecision: number;
  expectedHash?: string;
  requiredAstPatterns?: string[];
  schemaValidationRules?: Record<string, unknown>;
  expectedRowCount?: number;
  expectedColumns?: string[];
}

export interface BrokenProdTask {
  title: string;
  incidentDescription: string;
  buggyCode: string;
  fixHint: string;
  solutionCode: string;
  testConfig: LessonTestConfig;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface Lesson {
  id: string;
  moduleSlug: string;
  order: number;
  title: string;
  estimatedMinutes: number;
  theoryBlocks: TheoryBlock[];
  glossaryTerms: GlossaryTerm[];
  schemaPreview: LessonSchemaPreview[];
  taskDescription: string;
  seedCode: string;
  initialCode: string;
  solutionCode: string;
  testConfig: LessonTestConfig;
  brokenProdTask: BrokenProdTask;
  hints: [string, string, string]; // 1: direction, 2: syntax/functions, 3: full solution with explanation
}

export interface UserProgress {
  name: string;
  streakDays: number;
  lastActiveDate: string;
  completedLessonIds: string[];
  bookmarkedLessonIds: string[];
  moduleProgress: Record<string, { completedCount: number; totalCount: number }>;
}

export interface WorkerRequest {
  requestId: string;
  type: 'INIT' | 'RUN' | 'VERIFY';
  seedCode: string;
  userCode: string;
  testConfig?: LessonTestConfig;
}

export interface WorkerResponse {
  requestId: string;
  status: 'READY' | 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  executionTimeMs: number;
  columns?: string[];
  rows?: (string | number | boolean | null)[][];
  stdout?: string;
  dagNodes?: unknown[];
  errorDetails?: {
    line?: number;
    friendlyMessage: string;
    rawError: string;
  };
  verification?: {
    passed: boolean;
    feedback: string;
  };
}
