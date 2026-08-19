import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@sms/database';
import { Role } from '@sms/shared';
import { generateTempPassword, hashPassword } from '../common/password.util';
import { mapUnique, requireSchool } from '../common/school-scope';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { SetChildrenDto } from './dto/set-children.dto';

const CHILD_SELECT = {
  id: true,
  name: true,
  rollNo: true,
  class: { select: { id: true, name: true, section: true } },
} satisfies Prisma.StudentSelect;

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Provisions a PARENT login and links it to the given students, in one
   * transaction. Returns a one-time temp password (like teacher provisioning).
   */
  async create(schoolId: string | null, dto: CreateParentDto) {
    const sid = requireSchool(schoolId);
    await this.assertStudentsInSchool(sid, dto.studentIds);

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    try {
      const parent = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.create({
          data: {
            schoolId: sid,
            role: Role.PARENT,
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            passwordHash,
            mustChangePassword: true,
          },
        });
        await tx.parentStudent.createMany({
          data: dedupe(dto.studentIds).map((studentId) => ({
            schoolId: sid,
            parentId: user.id,
            studentId,
          })),
        });
        return user;
      });
      return { parent: await this.findOne(sid, parent.id), tempPassword };
    } catch (err) {
      throw mapUnique(err, 'A user with this email already exists');
    }
  }

  /** Lists PARENT users in the school with their linked children. */
  async findAll(schoolId: string | null) {
    const sid = requireSchool(schoolId);
    const parents = await this.prisma.user.findMany({
      where: { schoolId: sid, role: Role.PARENT },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        parentOf: { select: { student: { select: CHILD_SELECT } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return parents.map(toParent);
  }

  async findOne(schoolId: string | null, id: string) {
    const sid = requireSchool(schoolId);
    const parent = await this.prisma.user.findFirst({
      where: { id, schoolId: sid, role: Role.PARENT },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        parentOf: { select: { student: { select: CHILD_SELECT } } },
      },
    });
    if (!parent) throw new NotFoundException('Parent not found');
    return toParent(parent);
  }

  /** Replaces the parent's full set of linked children. */
  async setChildren(schoolId: string | null, id: string, dto: SetChildrenDto) {
    const sid = requireSchool(schoolId);
    const parent = await this.prisma.user.findFirst({
      where: { id, schoolId: sid, role: Role.PARENT },
    });
    if (!parent) throw new NotFoundException('Parent not found');
    await this.assertStudentsInSchool(sid, dto.studentIds);

    await this.prisma.$transaction([
      this.prisma.parentStudent.deleteMany({ where: { parentId: id } }),
      this.prisma.parentStudent.createMany({
        data: dedupe(dto.studentIds).map((studentId) => ({
          schoolId: sid,
          parentId: id,
          studentId,
        })),
      }),
    ]);
    return this.findOne(sid, id);
  }

  private async assertStudentsInSchool(schoolId: string, studentIds: string[]): Promise<void> {
    const ids = dedupe(studentIds);
    const found = await this.prisma.student.findMany({
      where: { id: { in: ids }, schoolId },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('One or more students do not belong to this school');
    }
  }
}

type ParentRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  parentOf: { student: Prisma.StudentGetPayload<{ select: typeof CHILD_SELECT }> }[];
};

function toParent(p: ParentRow) {
  const { parentOf, ...user } = p;
  return { ...user, children: parentOf.map((l) => l.student) };
}

function dedupe(ids: string[]): string[] {
  return [...new Set(ids)];
}
