import { Lesson } from '@/types/course';
import { postgresqlLesson1 } from './postgresql-lesson-1';
import { postgresqlLesson2 } from './postgresql-lesson-2';
import { postgresqlLesson3 } from './postgresql-lesson-3';
import { postgresqlLesson4 } from './postgresql-lesson-4';

export {
  postgresqlLesson1,
  postgresqlLesson2,
  postgresqlLesson3,
  postgresqlLesson4,
};

export const postgresqlLessons: Lesson[] = [
  postgresqlLesson1,
  postgresqlLesson2,
  postgresqlLesson3,
  postgresqlLesson4,
];
