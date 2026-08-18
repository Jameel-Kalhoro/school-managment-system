import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSchoolSettingsDto } from './dto/update-school-settings.dto';

/**
 * Admin-facing access to the caller's OWN school. School is not a tenant-scoped
 * model (it is the tenant root), so every method is explicitly constrained by
 * the authenticated user's schoolId — never trust a client-supplied id here.
 */
@Injectable()
export class SchoolService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwn(schoolId: string | null) {
    const id = this.requireSchoolId(schoolId);
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: { subscription: { include: { plan: true } } },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }
    return school;
  }

  async updateOwn(schoolId: string | null, dto: UpdateSchoolSettingsDto) {
    const id = this.requireSchoolId(schoolId);
    return this.prisma.school.update({ where: { id }, data: { ...dto } });
  }

  private requireSchoolId(schoolId: string | null): string {
    if (!schoolId) {
      throw new BadRequestException('This account is not associated with a school');
    }
    return schoolId;
  }
}
