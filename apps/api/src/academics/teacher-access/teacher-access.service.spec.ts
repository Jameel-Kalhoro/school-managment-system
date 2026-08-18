import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { TeacherAccessService } from './teacher-access.service';

describe('TeacherAccessService', () => {
  function make(schoolClassFindFirst: jest.Mock, teacherFindFirst = jest.fn()) {
    const prisma = {
      schoolClass: { findFirst: schoolClassFindFirst },
      teacher: { findFirst: teacherFindFirst },
    } as unknown as PrismaService;
    return new TeacherAccessService(prisma);
  }

  describe('assertTeachesClass', () => {
    it('resolves when a class is found (teacher owns or teaches it)', async () => {
      const svc = make(jest.fn().mockResolvedValue({ id: 'c1' }));
      await expect(svc.assertTeachesClass('t1', 'c1')).resolves.toBeUndefined();
    });

    it('throws Forbidden when the teacher does not teach the class', async () => {
      const svc = make(jest.fn().mockResolvedValue(null));
      await expect(svc.assertTeachesClass('t1', 'c1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getTeacherByUserId', () => {
    it('throws Forbidden when no teacher profile exists', async () => {
      const svc = make(jest.fn(), jest.fn().mockResolvedValue(null));
      await expect(svc.getTeacherByUserId('u1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns the teacher when found', async () => {
      const teacher = { id: 't1', userId: 'u1' };
      const svc = make(jest.fn(), jest.fn().mockResolvedValue(teacher));
      await expect(svc.getTeacherByUserId('u1')).resolves.toBe(teacher);
    });
  });
});
