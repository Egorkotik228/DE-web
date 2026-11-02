import { Lesson } from '@/types/course';
import { formatsS3Lesson1 } from './formats-s3-lesson-1';
import { formatsS3Lesson2 } from './formats-s3-lesson-2';
import { formatsS3Lesson3 } from './formats-s3-lesson-3';
import { formatsS3Lesson4 } from './formats-s3-lesson-4';
import { formatsS3Lesson5 } from './formats-s3-lesson-5';
import { formatsS3Lesson6 } from './formats-s3-lesson-6';

export {
  formatsS3Lesson1,
  formatsS3Lesson2,
  formatsS3Lesson3,
  formatsS3Lesson4,
  formatsS3Lesson5,
  formatsS3Lesson6,
};

export const formatsS3Lessons: Lesson[] = [
  formatsS3Lesson1,
  formatsS3Lesson2,
  formatsS3Lesson3,
  formatsS3Lesson4,
  formatsS3Lesson5,
  formatsS3Lesson6,
];
