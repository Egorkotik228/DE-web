import { Lesson } from '@/types/course';
import { postgresqlLesson1 } from './postgresql-lesson-1';
import { postgresqlLesson2 } from './postgresql-lesson-2';

export { postgresqlLesson1, postgresqlLesson2 };

export const postgresqlLessons: Lesson[] = [
  postgresqlLesson1,
  postgresqlLesson2,
];
