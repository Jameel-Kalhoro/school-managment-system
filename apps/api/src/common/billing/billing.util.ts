import { SchoolStatus } from '@sms/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Adds whole months to a date (clamps to end-of-month, e.g. Jan 31 → Feb 28). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

export interface BillingInputs {
  currentPeriodEnd: Date | null;
  schoolStatus: SchoolStatus;
  pricePkr: number;
}

export interface BillingState {
  amountPkr: number;
  dueDate: Date | null;
  /** whole days until due (negative if overdue); null when there is no due date */
  daysUntilDue: number | null;
  dueSoon: boolean;
  overdue: boolean;
  locked: boolean;
}

/**
 * Computes a school's billing state from its subscription. Manual, lazy —
 * no cron. A school is locked the moment the paid period ends (no grace), or
 * if the super admin has suspended/cancelled it. A null period end means the
 * school has not been billed yet: never locked, no banner.
 */
export function computeBilling(
  { currentPeriodEnd, schoolStatus, pricePkr }: BillingInputs,
  now: Date,
  dueDaysBefore: number,
): BillingState {
  const manuallyBlocked =
    schoolStatus === SchoolStatus.SUSPENDED || schoolStatus === SchoolStatus.CANCELLED;

  if (!currentPeriodEnd) {
    return {
      amountPkr: pricePkr,
      dueDate: null,
      daysUntilDue: null,
      dueSoon: false,
      overdue: false,
      locked: manuallyBlocked,
    };
  }

  const daysUntilDue = Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / DAY_MS);
  const overdue = now.getTime() >= currentPeriodEnd.getTime();

  return {
    amountPkr: pricePkr,
    dueDate: currentPeriodEnd,
    daysUntilDue,
    dueSoon: daysUntilDue <= dueDaysBefore,
    overdue,
    locked: overdue || manuallyBlocked,
  };
}
