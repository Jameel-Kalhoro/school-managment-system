import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@sms/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RolesGuard } from './roles.guard';

/** Builds an ExecutionContext whose request carries the given user. */
function contextWithUser(user: unknown): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

/** Reflector that returns isPublic / requiredRoles by metadata key. */
function reflectorWith(isPublic: boolean, roles: Role[] | undefined): Reflector {
  return {
    getAllAndOverride: (key: string) => (key === IS_PUBLIC_KEY ? isPublic : roles),
  } as unknown as Reflector;
}

describe('RolesGuard', () => {
  const admin = { id: '1', role: Role.ADMIN, schoolId: 's1' };
  const teacher = { id: '2', role: Role.TEACHER, schoolId: 's1' };
  const superAdmin = { id: '3', role: Role.SUPER_ADMIN, schoolId: null };

  it('allows public routes', () => {
    const guard = new RolesGuard(reflectorWith(true, [Role.ADMIN]));
    expect(guard.canActivate(contextWithUser(undefined))).toBe(true);
  });

  it('allows when no roles are required', () => {
    const guard = new RolesGuard(reflectorWith(false, undefined));
    expect(guard.canActivate(contextWithUser(teacher))).toBe(true);
  });

  it('allows a matching role', () => {
    const guard = new RolesGuard(reflectorWith(false, [Role.ADMIN]));
    expect(guard.canActivate(contextWithUser(admin))).toBe(true);
  });

  it('denies a non-matching role', () => {
    const guard = new RolesGuard(reflectorWith(false, [Role.ADMIN]));
    expect(guard.canActivate(contextWithUser(teacher))).toBe(false);
  });

  it('lets SUPER_ADMIN through any required role', () => {
    const guard = new RolesGuard(reflectorWith(false, [Role.ADMIN]));
    expect(guard.canActivate(contextWithUser(superAdmin))).toBe(true);
  });

  it('denies when there is no authenticated user', () => {
    const guard = new RolesGuard(reflectorWith(false, [Role.ADMIN]));
    expect(guard.canActivate(contextWithUser(undefined))).toBe(false);
  });
});
