import { Suspense } from 'react';
import LessonClient from './LessonClient';

export default function LessonPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#0D1117] flex items-center justify-center text-[#7D8590] text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Загрузка материалов урока...</span>
          </div>
        </div>
      }
    >
      <LessonClient />
    </Suspense>
  );
}
