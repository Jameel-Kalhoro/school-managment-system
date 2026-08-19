/**
 * @sms/shared — canonical enums, types and constants shared across
 * the API, worker and web apps. String values here MUST match the
 * corresponding Prisma enums in @sms/database.
 */

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum SchoolStatus {
  ACTIVE = 'ACTIVE',
  GRACE = 'GRACE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export enum SubscriptionStatus {
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export enum BillingPeriod {
  MONTHLY = 'MONTHLY',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  GRADUATED = 'GRADUATED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum TeacherStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  LEAVE = 'LEAVE',
}

export enum ExamType {
  QUIZ = 'QUIZ',
  MIDTERM = 'MIDTERM',
  FINAL = 'FINAL',
  ASSIGNMENT = 'ASSIGNMENT',
}

/** Roles that operate at the platform level (no school scope). */
export const PLATFORM_ROLES: readonly Role[] = [Role.SUPER_ADMIN];

/** Roles that are always bound to a single school (tenant). */
export const TENANT_ROLES: readonly Role[] = [
  Role.ADMIN,
  Role.TEACHER,
  Role.STUDENT,
  Role.PARENT,
];

/** Roles a school Admin is permitted to create (never SUPER_ADMIN). */
export const ADMIN_ASSIGNABLE_ROLES: readonly Role[] = [
  Role.ADMIN,
  Role.TEACHER,
  Role.STUDENT,
  Role.PARENT,
];

export function isPlatformRole(role: Role): boolean {
  return PLATFORM_ROLES.includes(role);
}

/** Shape of the JWT access-token payload. */
export interface JwtPayload {
  /** subject — user id */
  sub: string;
  role: Role;
  /** null for platform (super admin) users */
  schoolId: string | null;
  email: string;
}

/** Authenticated principal attached to each request. */
export interface AuthUser {
  id: string;
  role: Role;
  schoolId: string | null;
  email: string;
  name: string;
  mustChangePassword: boolean;
}
