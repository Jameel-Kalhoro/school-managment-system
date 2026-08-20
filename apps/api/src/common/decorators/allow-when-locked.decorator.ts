import { SetMetadata } from '@nestjs/common';

export const ALLOW_WHEN_LOCKED_KEY = 'allowWhenLocked';

/**
 * Marks a route as reachable even when the caller's school is billing-locked
 * (e.g. the billing status endpoint and change-password). The BillingGuard
 * otherwise blocks tenant routes for an overdue school.
 */
export const AllowWhenLocked = () => SetMetadata(ALLOW_WHEN_LOCKED_KEY, true);
