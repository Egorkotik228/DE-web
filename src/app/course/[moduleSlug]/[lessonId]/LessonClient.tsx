'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { getModuleBySlug } from '@/data/modules';
import { getLesson, getLessonsForModule } from '@/data/lessons';
import { useProgress } from '@/hooks/useProgress';
import { WorkerResponse } from '@/types/course';
import { executeCode } from '@/lib/codeRunner';
import { TechIcon } from '@/components/ui/TechIcon';
import { ERDiagram } from '@/components/visuals/ERDiagram';
import { DataFlowPipeline } from '@/components/visuals/DataFlowPipeline';
import { BeforeAfterTable } from '@/components/visuals/BeforeAfterTable';
import { CalloutBlock } from '@/components/lesson/CalloutBlock';
import { GlossaryText } from '@/components/lesson/GlossaryText';
import { BugReportModal } from '@/components/lesson/BugReportModal';
import { SolutionConfirmModal } from '@/components/lesson/SolutionConfirmModal';
import { DynamicMonaco } from '@/components/editor/DynamicMonaco';
import { SchemaPreviewViewer } from '@/components/editor/SchemaPreviewViewer';
import { OutputConsole } from '@/components/editor/OutputConsole';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Database,
  ArrowRight,
  Flame,
  FileCode,
  RotateCcw,
  Bug,
  Eye,
  Check,
  ChevronDown,
  BookOpen,
  Code2,
  Table,
} from 'lucide-react';

export default function LessonClient() {
  const params = useParams();
  const router = useRouter();
  const moduleSlug = Array.isArray(params.moduleSlug)
    ? params.moduleSlug[0]
    : (params.moduleSlug as string);
  const lessonId = Array.isArray(params.lessonId)
    ? params.lessonId[0]
    : (params.lessonId as string);

  const { markLessonCompleted, completedLessonIds } = useProgress();

  const currentModule = getModuleBySlug(moduleSlug);
  const currentLesson = getLesson(moduleSlug, lessonId);
  const moduleLessons = getLessonsForModule(moduleSlug);

  // Responsive mobile state (< 1024px)
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'theory' | 'editor' | 'output'>('theory');

  // Right panel tabs: code or schema
  const [rightPanelTab, setRightPanelTab] = useState<'code' | 'schema'>('code');

  // Mode: normal vs "Сломанный прод"
  const [isBrokenProdMode, setIsBrokenProdMode] = useState<boolean>(false);

  // Lesson dropdown open state
  const [isLessonDropdownOpen, setIsLessonDropdownOpen] = useState(false);

  // Hint spoilers
  const [revealedHint1, setRevealedHint1] = useState(false);
  const [revealedHint2, setRevealedHint2] = useState(false);
  const [revealedSolution, setRevealedSolution] = useState(false);

  // Modals
  const [isSolutionModalOpen, setIsSolutionModalOpen] = useState(false);
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);

  // Worker execution and output state
  const [workerResponse, setWorkerResponse] = useState<WorkerResponse | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Listen for window resize for desktop vs mobile layout
  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const draftKey = currentLesson
    ? isBrokenProdMode
      ? `draft_broken_${currentLesson.id}`
      : `draft_normal_${currentLesson.id}`
    : '';

  const getInitialCode = () => {
    if (!currentLesson) return '';
    if (typeof window !== 'undefined' && draftKey) {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved !== null) return saved;
      } catch {
        // ignore
      }
    }
    return isBrokenProdMode
      ? currentLesson.brokenProdTask.buggyCode
      : currentLesson.initialCode;
  };

  const [code, setCode] = useState<string>(getInitialCode);
  const [prevDraftKey, setPrevDraftKey] = useState<string>(draftKey);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Adjust state when draftKey changes without effect cascading
  if (draftKey !== prevDraftKey) {
    setPrevDraftKey(draftKey);
    setCode(getInitialCode());
    setSaveStatus('saved');
    setWorkerResponse(null);
  }

  // Handle user code edits
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setSaveStatus('saving');
  };

  // Debounced autosave (1500 ms)
  useEffect(() => {
    if (saveStatus !== 'saving' || !draftKey) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, code);
        setSaveStatus('saved');
      } catch {
        // ignore storage error
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [code, draftKey, saveStatus]);

  if (!currentModule || !currentLesson) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#151B23] border border-[#21262D] flex items-center justify-center mb-4 text-[#7D8590]">
          <Database className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold mb-2">Урок находится в разработке</h1>
        <p className="text-xs text-[#7D8590] max-w-md mb-6">
          Материалы для раздела «{currentModule ? currentModule.title : moduleSlug}» активно наполняются по стандарту ARCHITECTURE.md.
        </p>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-semibold transition-colors"
        >
          Вернуться к Карте Стека
        </Link>
      </div>
    );
  }

  const isCompleted = completedLessonIds.includes(currentLesson.id);

  // Lesson pagination
  const currentIndex = moduleLessons.findIndex((l) => l.id === currentLesson.id);
  const prevLesson = currentIndex > 0 ? moduleLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < moduleLessons.length - 1 ? moduleLessons[currentIndex + 1] : null;

  // Run code handler
  const handleRunCode = () => {
    setIsRunning(true);
    if (isMobile) setMobileTab('output');
    setTimeout(() => {
      const res = executeCode(code, currentLesson, isBrokenProdMode, false);
      setWorkerResponse(res);
      setIsRunning(false);
    }, 280);
  };

  // Verify code handler
  const handleVerifyCode = () => {
    setIsRunning(true);
    if (isMobile) setMobileTab('output');
    setTimeout(() => {
      const res = executeCode(code, currentLesson, isBrokenProdMode, true);
      setWorkerResponse(res);
      setIsRunning(false);
      if (res.verification?.passed) {
        markLessonCompleted(currentLesson.id, currentModule.slug);
      }
    }, 380);
  };

  // Reset code
  const handleResetCode = () => {
    const defaultCode = isBrokenProdMode
      ? currentLesson.brokenProdTask.buggyCode
      : currentLesson.initialCode;
    setCode(defaultCode);
    const storageKey = isBrokenProdMode
      ? `draft_broken_${currentLesson.id}`
      : `draft_normal_${currentLesson.id}`;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#0D1117] text-[#E6EDF3]">
      {/* 1. Upper Lesson Navigation Bar */}
      <header className="h-16 border-b border-[#21262D] bg-[#090C10] px-4 md:px-6 flex items-center justify-between shrink-0 z-30 select-none">
        {/* Left: Back to Stack & Dropdown Lesson Selector */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151B23] border border-[#21262D] hover:border-[#30363D] text-xs font-medium text-[#E6EDF3] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[#7D8590]" />
            <span className="hidden sm:inline">Карта стека</span>
          </Link>

          <span className="text-[#21262D] hidden sm:inline">•</span>

          {/* Module Tech Icon and Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLessonDropdownOpen(!isLessonDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151B23] border border-[#21262D] hover:border-emerald-500/40 text-xs text-[#E6EDF3] transition-all cursor-pointer"
            >
              <TechIcon slug={currentModule.slug} size={16} />
              <span className="font-semibold text-emerald-400 hidden sm:inline">
                {currentModule.title}:
              </span>
              <span className="font-medium truncate max-w-[180px] md:max-w-[280px]">
                Урок {currentLesson.order}. {currentLesson.title}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#7D8590] ml-1" />
            </button>

            {/* Dropdown Menu */}
            {isLessonDropdownOpen && (
              <div
                className="absolute left-0 top-full mt-2 w-80 md:w-96 bg-[#151B23] border border-[#21262D] rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#21262D]"
                onClick={() => setIsLessonDropdownOpen(false)}
              >
                <div className="px-3 py-2 text-[11px] font-mono text-[#7D8590] uppercase tracking-wider border-b border-[#21262D]">
                  Уроки раздела ({moduleLessons.length})
                </div>

                <div className="space-y-1 py-1">
                  {moduleLessons.map((l) => {
                    const lDone = completedLessonIds.includes(l.id);
                    const lActive = l.id === currentLesson.id;
                    return (
                      <Link
                        key={l.id}
                        href={`/course/${currentModule.slug}/${l.id}`}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                          lActive
                            ? 'bg-[#21262D] text-emerald-400 font-bold'
                            : 'text-[#E6EDF3] hover:bg-[#21262D]/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-[11px] font-mono text-[#7D8590]">#{l.order}</span>
                          <span className="truncate">{l.title}</span>
                        </div>
                        {lDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </Link>
                    );
                  })}
                </div>

                {/* Upcoming Topics from Curriculum */}
                <div className="px-3 py-2 mt-2 text-[10px] font-mono text-[#7D8590] uppercase tracking-wider border-t border-[#21262D]">
                  Темы программы раздела:
                </div>
                <div className="px-3 py-1 space-y-1 text-[11px] text-[#7D8590]">
                  {currentModule.curriculumTopics.map((topic, i) => (
                    <div key={i} className="flex items-start gap-1.5 leading-snug">
                      <span className="text-emerald-500/70 shrink-0">•</span>
                      <span>{topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Prev, Next & Complete */}
        <div className="flex items-center gap-2">
          {/* Prev Lesson Button */}
          {prevLesson ? (
            <Link
              href={`/course/${currentModule.slug}/${prevLesson.id}`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#151B23] border border-[#21262D] hover:bg-[#21262D] text-xs text-[#E6EDF3] transition-colors"
              title={`Предыдущий: ${prevLesson.title}`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden md:inline">Назад</span>
            </Link>
          ) : (
            <span className="px-2.5 py-1.5 rounded-lg text-xs text-[#7D8590]/40 border border-[#21262D]/40 cursor-not-allowed hidden md:inline-flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />
              <span>Назад</span>
            </span>
          )}

          {/* Next Lesson Button */}
          {nextLesson ? (
            <Link
              href={`/course/${currentModule.slug}/${nextLesson.id}`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#151B23] border border-[#21262D] hover:bg-[#21262D] text-xs text-[#E6EDF3] transition-colors"
              title={`Следующий: ${nextLesson.title}`}
            >
              <span className="hidden md:inline">Вперед</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <span className="px-2.5 py-1.5 rounded-lg text-xs text-[#7D8590]/40 border border-[#21262D]/40 cursor-not-allowed hidden md:inline-flex items-center gap-1">
              <span>Вперед</span>
              <ChevronRight className="w-4 h-4" />
            </span>
          )}

          <div className="h-4 w-[1px] bg-[#21262D] mx-1" />

          {/* Complete Lesson CTA */}
          <button
            onClick={() => {
              markLessonCompleted(currentLesson.id, currentModule.slug);
              if (nextLesson) {
                router.push(`/course/${currentModule.slug}/${nextLesson.id}`);
              } else {
                router.push('/');
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black transition-colors shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            {isCompleted ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden sm:inline">Пройдено</span>
              </>
            ) : (
              <>
                <span>Завершить</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. Mobile Tab Switcher (< 1024px) */}
      {isMobile && (
        <div className="h-10 px-4 border-b border-[#21262D] bg-[#090C10] flex items-center justify-around text-xs shrink-0">
          <button
            onClick={() => setMobileTab('theory')}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md transition-colors ${
              mobileTab === 'theory'
                ? 'bg-[#151B23] text-emerald-400 font-bold border border-emerald-500/30'
                : 'text-[#7D8590]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>📖 Теория и Задача</span>
          </button>

          <button
            onClick={() => setMobileTab('editor')}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md transition-colors ${
              mobileTab === 'editor'
                ? 'bg-[#151B23] text-emerald-400 font-bold border border-emerald-500/30'
                : 'text-[#7D8590]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>💻 Редактор</span>
          </button>

          <button
            onClick={() => setMobileTab('output')}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md transition-colors ${
              mobileTab === 'output'
                ? 'bg-[#151B23] text-emerald-400 font-bold border border-emerald-500/30'
                : 'text-[#7D8590]'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>📊 Результат</span>
          </button>
        </div>
      )}

      {/* 3. Main Workspace Area: Adaptive Split-Screen or Mobile View */}
      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          /* Mobile Single-Tab View */
          <div className="h-full w-full overflow-hidden flex flex-col">
            {mobileTab === 'theory' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Theory & Visuals */}
                <TheoryContent
                  currentLesson={currentLesson}
                  currentModule={currentModule}
                  revealedHint1={revealedHint1}
                  revealedHint2={revealedHint2}
                  revealedSolution={revealedSolution}
                  onRevealHint1={() => setRevealedHint1(true)}
                  onRevealHint2={() => setRevealedHint2(true)}
                  onOpenSolutionModal={() => setIsSolutionModalOpen(true)}
                  onOpenBugReport={() => setIsBugModalOpen(true)}
                />
              </div>
            )}

            {mobileTab === 'editor' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <EditorHeader
                  rightPanelTab={rightPanelTab}
                  onSetRightPanelTab={setRightPanelTab}
                  isBrokenProdMode={isBrokenProdMode}
                  onToggleBrokenProd={() => setIsBrokenProdMode(!isBrokenProdMode)}
                  saveStatus={saveStatus}
                  onResetCode={handleResetCode}
                  brokenIncident={currentLesson.brokenProdTask.incidentDescription}
                />
                <div className="flex-1 overflow-hidden">
                  {rightPanelTab === 'code' ? (
                    <DynamicMonaco
                      value={code}
                      onChange={handleCodeChange}
                      language={currentModule.engineType}
                      onRunCode={handleRunCode}
                    />
                  ) : (
                    <SchemaPreviewViewer schemas={currentLesson.schemaPreview} />
                  )}
                </div>
              </div>
            )}

            {mobileTab === 'output' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <OutputConsole
                  response={workerResponse}
                  isRunning={isRunning}
                  onRunCode={handleRunCode}
                  onVerifyCode={handleVerifyCode}
                  testConfig={currentLesson.testConfig}
                />
              </div>
            )}
          </div>
        ) : (
          /* Desktop Split-Screen using react-resizable-panels Group/Panel/Separator */
          <Group orientation="horizontal" className="h-full w-full">
            {/* Left Panel: Theory, Diagrams, Glossary, Spoilers (45% default) */}
            <Panel defaultSize="45%" minSize="25%" className="h-full overflow-y-auto p-8 space-y-8 bg-[#0D1117] scrollbar-thin scrollbar-thumb-[#21262D]">
              <TheoryContent
                currentLesson={currentLesson}
                currentModule={currentModule}
                revealedHint1={revealedHint1}
                revealedHint2={revealedHint2}
                revealedSolution={revealedSolution}
                onRevealHint1={() => setRevealedHint1(true)}
                onRevealHint2={() => setRevealedHint2(true)}
                onOpenSolutionModal={() => setIsSolutionModalOpen(true)}
                onOpenBugReport={() => setIsBugModalOpen(true)}
              />
            </Panel>

            {/* Vertical Resizable Separator */}
            <Separator className="w-1.5 bg-[#21262D] hover:bg-emerald-500/50 transition-colors cursor-col-resize flex items-center justify-center">
              <div className="h-8 w-0.5 bg-[#7D8590] rounded-full" />
            </Separator>

            {/* Right Panel: Workspace IDE & Bottom Output Console (55% default) */}
            <Panel defaultSize="55%" minSize="30%" className="h-full overflow-hidden flex flex-col bg-[#090C10]">
              <Group orientation="vertical" className="h-full w-full">
                {/* Top IDE Panel: Editor or Schema (~60% default) */}
                <Panel defaultSize="60%" minSize="30%" className="overflow-hidden flex flex-col">
                  {/* Top Editor Header */}
                  <EditorHeader
                    rightPanelTab={rightPanelTab}
                    onSetRightPanelTab={setRightPanelTab}
                    isBrokenProdMode={isBrokenProdMode}
                    onToggleBrokenProd={() => setIsBrokenProdMode(!isBrokenProdMode)}
                    saveStatus={saveStatus}
                    onResetCode={handleResetCode}
                    brokenIncident={currentLesson.brokenProdTask.incidentDescription}
                  />

                  {/* Editor or Schema Content */}
                  <div className="flex-1 overflow-hidden relative">
                    {rightPanelTab === 'code' ? (
                      <DynamicMonaco
                        value={code}
                        onChange={handleCodeChange}
                        language={currentModule.engineType}
                        onRunCode={handleRunCode}
                      />
                    ) : (
                      <SchemaPreviewViewer schemas={currentLesson.schemaPreview} />
                    )}
                  </div>
                </Panel>

                {/* Horizontal Resizable Separator */}
                <Separator className="h-1.5 bg-[#21262D] hover:bg-emerald-500/50 transition-colors cursor-row-resize flex items-center justify-center">
                  <div className="w-8 h-0.5 bg-[#7D8590] rounded-full" />
                </Separator>

                {/* Bottom Console Panel (~40% default) */}
                <Panel defaultSize="40%" minSize="20%" className="overflow-hidden flex flex-col">
                  <OutputConsole
                    response={workerResponse}
                    isRunning={isRunning}
                    onRunCode={handleRunCode}
                    onVerifyCode={handleVerifyCode}
                    testConfig={currentLesson.testConfig}
                  />
                </Panel>
              </Group>
            </Panel>
          </Group>
        )}
      </div>

      {/* Confirmation Modal for Solution Reveal */}
      <SolutionConfirmModal
        isOpen={isSolutionModalOpen}
        onClose={() => setIsSolutionModalOpen(false)}
        onConfirmReveal={() => setRevealedSolution(true)}
        onInsertCode={(sol) => setCode(sol)}
        solutionCode={currentLesson.solutionCode}
      />

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={isBugModalOpen}
        onClose={() => setIsBugModalOpen(false)}
        lessonId={currentLesson.id}
        lessonTitle={currentLesson.title}
        currentCode={code}
      />
    </div>
  );
}

// Subcomponent: Editor Top Header Bar with Tabs, Autosave, Broken Prod mode
function EditorHeader({
  rightPanelTab,
  onSetRightPanelTab,
  isBrokenProdMode,
  onToggleBrokenProd,
  saveStatus,
  onResetCode,
  brokenIncident,
}: {
  rightPanelTab: 'code' | 'schema';
  onSetRightPanelTab: (t: 'code' | 'schema') => void;
  isBrokenProdMode: boolean;
  onToggleBrokenProd: () => void;
  saveStatus: 'saved' | 'saving';
  onResetCode: () => void;
  brokenIncident: string;
}) {
  return (
    <div className="flex flex-col shrink-0">
      <div className="h-12 px-4 border-b border-[#21262D] bg-[#090C10] flex items-center justify-between select-none">
        {/* Left Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSetRightPanelTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              rightPanelTab === 'code'
                ? 'bg-[#151B23] text-emerald-400 border border-emerald-500/30'
                : 'text-[#7D8590] hover:text-[#E6EDF3]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>[💻 Код решения]</span>
          </button>

          <button
            onClick={() => onSetRightPanelTab('schema')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              rightPanelTab === 'schema'
                ? 'bg-[#151B23] text-emerald-400 border border-emerald-500/30'
                : 'text-[#7D8590] hover:text-[#E6EDF3]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>[📊 Схема данных]</span>
          </button>
        </div>

        {/* Right Controls: Broken Prod, Autosave, Reset */}
        <div className="flex items-center gap-2">
          {/* Autosave status indicator */}
          <span className="text-[11px] font-mono text-[#7D8590] hidden sm:inline-flex items-center gap-1">
            {saveStatus === 'saving' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Сохранение...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400/90">Черновик сохранен</span>
              </>
            )}
          </span>

          {/* Reset Code Button */}
          <button
            onClick={onResetCode}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#151B23] border border-[#21262D] hover:bg-[#21262D] text-[#7D8590] hover:text-[#E6EDF3] transition-colors"
            title="Сбросить код к начальному шаблону"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* 🔥 Сломанный прод Button */}
          <button
            onClick={onToggleBrokenProd}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              isBrokenProdMode
                ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                : 'bg-red-950/30 border border-red-500/40 text-red-400 hover:bg-red-950/60'
            }`}
            title="Режим симулятора аварии в продакшене"
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>Сломанный прод</span>
          </button>
        </div>
      </div>

      {/* Red Alert Banner when Broken Prod mode is active */}
      {isBrokenProdMode && (
        <div className="bg-red-950/40 border-b border-red-500/40 px-4 py-2.5 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400 fill-current shrink-0" />
            <div>
              <span className="font-bold text-red-400 mr-1.5">АВАРИЯ В ПРОДЕ:</span>
              <span>{brokenIncident}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-red-400 bg-red-900/40 px-2 py-0.5 rounded border border-red-500/30 shrink-0 ml-2">
            Изолированный черновик
          </span>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Theory & Visuals Content Container
function TheoryContent({
  currentLesson,
  currentModule,
  revealedHint1,
  revealedHint2,
  revealedSolution,
  onRevealHint1,
  onRevealHint2,
  onOpenSolutionModal,
  onOpenBugReport,
}: {
  currentLesson: ReturnType<typeof getLesson>;
  currentModule: ReturnType<typeof getModuleBySlug>;
  revealedHint1: boolean;
  revealedHint2: boolean;
  revealedSolution: boolean;
  onRevealHint1: () => void;
  onRevealHint2: () => void;
  onOpenSolutionModal: () => void;
  onOpenBugReport: () => void;
}) {
  if (!currentLesson || !currentModule) return null;

  return (
    <div className="space-y-8">
      {/* Title & Metadata */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
          <span>{currentModule.title}</span>
          <span>•</span>
          <span>Урок {currentLesson.order}</span>
          <span>•</span>
          <span>{currentLesson.estimatedMinutes} мин чтения</span>
        </div>
        <h1 className="text-2xl font-bold text-[#E6EDF3] leading-snug">
          {currentLesson.title}
        </h1>
      </div>

      {/* Theory Blocks */}
      {currentLesson.theoryBlocks.map((block, idx) => {
        if (block.type === 'markdown') {
          return (
            <div key={idx} className="text-sm text-[#E6EDF3] leading-relaxed">
              <GlossaryText content={block.content} terms={currentLesson.glossaryTerms} />
            </div>
          );
        }

        if (block.type === 'callout') {
          return (
            <CalloutBlock
              key={idx}
              variant={block.variant}
              title={block.title}
              content={block.content}
            />
          );
        }

        if (block.type === 'er-diagram') {
          return <ERDiagram key={idx} data={block.data} />;
        }

        if (block.type === 'data-flow') {
          return <DataFlowPipeline key={idx} data={block.data} />;
        }

        if (block.type === 'before-after-table') {
          return <BeforeAfterTable key={idx} data={block.data} />;
        }

        return null;
      })}

      {/* Task Description Block */}
      <div className="bg-[#151B23] border border-[#21262D] rounded-xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <span>🎯</span> Практическое задание
        </h3>
        <p className="text-sm text-[#E6EDF3] leading-relaxed whitespace-pre-wrap font-sans">
          {currentLesson.taskDescription}
        </p>
      </div>

      {/* 3-Level Spoilers */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#7D8590]">
          Подсказки к заданию (Спойлеры)
        </h4>

        {/* Spoiler 1 */}
        <div className="bg-[#151B23] border border-[#21262D] rounded-xl p-4 transition-all">
          {revealedHint1 ? (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <span className="text-xs font-bold text-emerald-400 block">
                💡 Подсказка 1: Идея и алгоритм решения
              </span>
              <p className="text-xs text-[#E6EDF3] leading-relaxed">
                {currentLesson.hints[0]}
              </p>
            </div>
          ) : (
            <button
              onClick={onRevealHint1}
              className="w-full text-left flex items-center justify-between text-xs font-medium text-[#7D8590] hover:text-[#E6EDF3] transition-colors cursor-pointer"
            >
              <span>💡 Подсказка 1: Идея и алгоритм решения</span>
              <Eye className="w-4 h-4 text-[#7D8590]" />
            </button>
          )}
        </div>

        {/* Spoiler 2 */}
        <div className="bg-[#151B23] border border-[#21262D] rounded-xl p-4 transition-all">
          {revealedHint2 ? (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <span className="text-xs font-bold text-sky-400 block">
                🛠 Подсказка 2: Синтаксис и нужные конструкции
              </span>
              <p className="text-xs text-[#E6EDF3] leading-relaxed">
                {currentLesson.hints[1]}
              </p>
            </div>
          ) : (
            <button
              onClick={onRevealHint2}
              className="w-full text-left flex items-center justify-between text-xs font-medium text-[#7D8590] hover:text-[#E6EDF3] transition-colors cursor-pointer"
            >
              <span>🛠 Подсказка 2: Синтаксис и нужные конструкции</span>
              <Eye className="w-4 h-4 text-[#7D8590]" />
            </button>
          )}
        </div>

        {/* Spoiler 3: Solution */}
        <div className="bg-[#151B23] border border-[#21262D] rounded-xl p-4 transition-all">
          {revealedSolution ? (
            <div className="space-y-2 animate-in fade-in duration-150">
              <span className="text-xs font-bold text-purple-400 block">
                👁 Эталонное решение:
              </span>
              <p className="text-xs text-[#7D8590] leading-relaxed mb-2">
                {currentLesson.hints[2]}
              </p>
              <pre className="p-3 bg-[#090C10] border border-[#21262D] rounded-lg font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                {currentLesson.solutionCode}
              </pre>
            </div>
          ) : (
            <button
              onClick={onOpenSolutionModal}
              className="w-full text-left flex items-center justify-between text-xs font-medium text-amber-400/90 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <span>👁 Показать эталонное решение</span>
              <Eye className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Bug Report Link */}
      <div className="pt-6 border-t border-[#21262D] flex items-center justify-between text-xs text-[#7D8590]">
        <button
          onClick={onOpenBugReport}
          className="flex items-center gap-1.5 text-[#7D8590] hover:text-amber-400 transition-colors cursor-pointer"
        >
          <Bug className="w-3.5 h-3.5" />
          <span>🐞 Нашли неточность в уроке?</span>
        </button>
        <span className="font-mono text-[11px]">ID: {currentLesson.id}</span>
      </div>
    </div>
  );
}
