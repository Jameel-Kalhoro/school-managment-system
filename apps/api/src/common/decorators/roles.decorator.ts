import { SetMetadata } from '@nestjs/common';
import { Role } from '@sms/shared';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles (SUPER_ADMIN always allowed). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
