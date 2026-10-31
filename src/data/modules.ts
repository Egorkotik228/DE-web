import { TrackModule } from '@/types/course';
import { level1Modules } from './modules/level1';
import { level2Modules } from './modules/level2';
import { level3Modules } from './modules/level3';
import { level4Modules } from './modules/level4';
import { level5Modules } from './modules/level5';
import { level6Modules } from './modules/level6';
import { level7Modules } from './modules/level7';

export const MODULES: TrackModule[] = [
  ...level1Modules,
  ...level2Modules,
  ...level3Modules,
  ...level4Modules,
  ...level5Modules,
  ...level6Modules,
  ...level7Modules,
];

export function getModuleBySlug(slug: string): TrackModule | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export function getModuleById(id: string): TrackModule | undefined {
  return MODULES.find((m) => m.id === id);
}

export function getAllInterviewQuestions() {
  return MODULES.flatMap((m) =>
    m.interviewQuestions.map((q) => ({
      ...q,
      moduleSlug: m.slug,
      moduleTitle: m.title,
    }))
  );
}

export function getAllCheatSheets() {
  return MODULES.map((m) => ({
    id: m.id,
    slug: m.slug,
    title: m.title,
    levelTitle: m.levelTitle,
    markdown: m.cheatSheetMarkdown,
  }));
}
