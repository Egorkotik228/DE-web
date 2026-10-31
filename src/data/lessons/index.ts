import { Lesson } from '@/types/course';
import { introLessons } from './intro';
import { sqlLessons } from './sql';
import { pythonLessons } from './python';
import { pandasLessons } from './pandas';
import { dataVaultLessons } from './data-vault';

export const ALL_LESSONS: Lesson[] = [
  ...introLessons,
  ...sqlLessons,
  ...pythonLessons,
  ...pandasLessons,
  ...dataVaultLessons,
];

export function getLesson(moduleSlug: string, lessonId: string): Lesson | undefined {
  return ALL_LESSONS.find(
    (l) => l.moduleSlug === moduleSlug && (l.id === lessonId || String(l.order) === lessonId)
  );
}

export function getLessonsForModule(moduleSlug: string): Lesson[] {
  return ALL_LESSONS.filter((l) => l.moduleSlug === moduleSlug).sort((a, b) => a.order - b.order);
}

export function getFirstLessonForModule(moduleSlug: string): Lesson | undefined {
  const moduleLessons = getLessonsForModule(moduleSlug);
  return moduleLessons[0];
}
