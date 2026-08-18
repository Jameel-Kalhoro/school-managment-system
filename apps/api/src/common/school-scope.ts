import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@sms/database';

/** Ensures the caller has a school context; used by tenant-scoped services. */
export function requireSchool(schoolId: string | null): string {
  if (!schoolId) {
    throw new BadRequestException('This account is not associated with a school');
  }
  return schoolId;
}

/** Maps a Prisma unique-constraint violation (P2002) to a 409 with a message. */
export function mapUnique(err: unknown, message: string): unknown {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return new ConflictException(message);
  }
  return err;
}
