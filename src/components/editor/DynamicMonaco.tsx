'use client';

import dynamic from 'next/dynamic';

export const DynamicMonaco = dynamic(
  () => import('./MonacoEditorWrapper').then((mod) => mod.MonacoEditorWrapper),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0D1117] text-[#7D8590] text-xs font-mono gap-2 min-h-[220px]">
        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span>Инициализация редактора кода...</span>
      </div>
    ),
  }
);
