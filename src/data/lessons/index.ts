import { Lesson } from '@/types/course';
import { introLessons } from './intro';
import { sqlLessons } from './sql';
import { pythonLessons } from './python';
import { pandasLessons } from './pandas';
import { postgresqlLessons } from './postgresql';
import { dwhLessons } from './dwh';
import { dataVaultLessons } from './data-vault';
import { linuxGitLessons } from './linux-git';
import { dockerLessons } from './docker';
import { airflowLessons } from './airflow';
import { dbtLessons } from './dbt';
import { formatsS3Lessons } from './formats-s3';
import { hadoopLessons } from './hadoop';
import { sparkLessons } from './spark';
import { clickhouseLessons } from './clickhouse';
import { kafkaLessons } from './kafka';
import { systemDesignLessons } from './system-design';

export const ALL_LESSONS: Lesson[] = [
  ...introLessons,
  ...sqlLessons,
  ...pythonLessons,
  ...pandasLessons,
  ...postgresqlLessons,
  ...dwhLessons,
  ...dataVaultLessons,
  ...linuxGitLessons,
  ...dockerLessons,
  ...airflowLessons,
  ...dbtLessons,
  ...formatsS3Lessons,
  ...hadoopLessons,
  ...sparkLessons,
  ...clickhouseLessons,
  ...kafkaLessons,
  ...systemDesignLessons,
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
