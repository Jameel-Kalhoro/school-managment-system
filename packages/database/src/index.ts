import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

/**
 * Prisma model names that carry a `schoolId` and must be tenant-scoped.
 * The API's tenant middleware uses this list to auto-inject the current
 * school's id on reads/writes (see apps/api PrismaService). As academic
 * models are added in later phases, register them here.
 */
export const TENANT_MODELS: readonly string[] = [
  'User',
  'AcademicYear',
  'Subject',
  'Teacher',
  'SchoolClass',
  'Student',
  'ClassSubject',
  'Attendance',
  'Assignment',
  'Grade',
];

/**
 * Lazily-instantiated singleton — avoids exhausting DB connections during
 * hot-reload in dev. Prefer the Nest-managed PrismaService inside the API;
 * this export is convenient for the worker and scripts.
 */
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}
