import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@sms/database';
import { ADMIN_ASSIGNABLE_ROLES, UserStatus } from '@sms/shared';
import { generateTempPassword, hashPassword } from '../common/password.util';
import {
  paginated,
  toSkipTake,
  type PaginationQueryDto,
} from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQuery } from './dto/list-users.query';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  phone: true,
  schoolId: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a user in the caller's school. `schoolId` comes from the
   * authenticated Admin (never the request body). SUPER_ADMIN cannot use this
   * endpoint (no school context) — they onboard schools via /platform.
   */
  async create(schoolId: string | null, dto: CreateUserDto) {
    if (!schoolId) {
      throw new BadRequestException(
        'Only a school Admin can create users. Use platform onboarding for schools.',
      );
    }
    if (!ADMIN_ASSIGNABLE_ROLES.includes(dto.role)) {
      throw new ForbiddenException(`You cannot create a ${dto.role} account`);
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    try {
      const user = await this.prisma.user.create({
        data: {
          schoolId,
          role: dto.role,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          mustChangePassword: true,
        },
        select: USER_SELECT,
      });
      return { user, tempPassword };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A user with this email already exists');
      }
      throw err;
    }
  }

  async findAll(query: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        ...toSkipTake(query as PaginationQueryDto),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginated(data, total, query);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id }, select: USER_SELECT });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    if (dto.role && !ADMIN_ASSIGNABLE_ROLES.includes(dto.role)) {
      throw new ForbiddenException(`You cannot assign the ${dto.role} role`);
    }
    const { count } = await this.prisma.user.updateMany({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
        status: dto.status,
      },
    });
    if (count === 0) {
      throw new NotFoundException('User not found');
    }
    return this.findOne(id);
  }

  async setStatus(id: string, status: UserStatus) {
    const { count } = await this.prisma.user.updateMany({ where: { id }, data: { status } });
    if (count === 0) {
      throw new NotFoundException('User not found');
    }
    return this.findOne(id);
  }

  /**
   * Deletes a user in the caller's school. The Prisma extension scopes the
   * delete to the caller's schoolId, so an Admin can only remove their own
   * school's users (and never a SUPER_ADMIN). Dependents are freed by the
   * schema's cascade/SetNull rules: a backing Teacher profile is removed and
   * its class-teacher / subject-teacher slots and activity authorship are
   * nulled; a backing Student keeps its record with the login link cleared.
   */
  async remove(currentUserId: string, id: string) {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    const { count } = await this.prisma.user.deleteMany({ where: { id } });
    if (count === 0) {
      throw new NotFoundException('User not found');
    }
    return { id, deleted: true };
  }
}
