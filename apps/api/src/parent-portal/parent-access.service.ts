import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Authorization for a logged-in PARENT user. A parent may only act on a
 * student explicitly linked to them via ParentStudent. Mirrors
 * TeacherAccessService for the teacher portal.
 */
@Injectable()
export class ParentAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Throws unless the parent is linked to the given student. */
  async assertParentOf(parentUserId: string, studentId: string): Promise<void> {
    const link = await this.prisma.parentStudent.findFirst({
      where: { parentId: parentUserId, studentId },
    });
    if (!link) {
      throw new ForbiddenException('You are not a guardian of this student');
    }
  }
}
