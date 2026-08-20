'use client';

import { Role } from '@sms/shared';
import type { ReactNode } from 'react';
import { Alert, Card, Spinner } from '@/components/ui';
import { billingApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { BillingStatus } from '@/lib/types';
import { useAsync } from '@/lib/use-async';

/**
 * Wraps a school role's pages. Fetches billing status once; if the school is
 * locked (overdue), shows a full-screen pay-now notice instead of the app. For
 * admins, also renders the "due soon" banner above the page. The server 402 is
 * the real enforcement — this is the friendly UI.
 */
export function BillingGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const billing = useAsync(() => billingApi.status(), []);
  const isAdmin = user?.role === Role.ADMIN;

  if (billing.loading) return <Spinner />;
  // Fail open on a status error — the server still guards every data route.
  if (billing.error || !billing.data) return <>{children}</>;

  const b = billing.data;
  if (b.locked) return <LockScreen billing={b} isAdmin={isAdmin} />;

  return (
    <>
      {isAdmin && b.dueSoon && <DueBanner billing={b} />}
      {children}
    </>
  );
}

function DueBanner({ billing }: { billing: BillingStatus }) {
  const due = billing.dueDate ? billing.dueDate.slice(0, 10) : '';
  const when =
    billing.daysUntilDue != null && billing.daysUntilDue >= 0
      ? `in ${billing.daysUntilDue} day${billing.daysUntilDue === 1 ? '' : 's'}`
      : 'now';
  return (
    <div className="mb-4">
      <Alert tone="error">
        <div className="text-sm">
          <strong>Monthly payment due {when}</strong> (PKR {billing.amountPkr}, due {due}). Pay via
          EasyPaisa <strong>{billing.payTo.easypaisaAccount}</strong> ({billing.payTo.easypaisaTitle}
          ), then send the receipt to <strong>{billing.payTo.whatsappReceipt}</strong> on WhatsApp.
        </div>
      </Alert>
    </div>
  );
}

function LockScreen({ billing, isAdmin }: { billing: BillingStatus; isAdmin: boolean }) {
  const due = billing.dueDate ? billing.dueDate.slice(0, 10) : '';
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="max-w-lg text-center">
        <h2 className="text-lg font-semibold text-slate-900">This school is locked</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your school has not cleared the monthly payment{due ? ` (due ${due})` : ''}. The system is
          locked until the platform records your payment.
        </p>
        {isAdmin ? (
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-left text-sm text-slate-700">
            <p>
              Pay <strong>PKR {billing.amountPkr}</strong> via EasyPaisa:
            </p>
            <p className="mt-1">
              Account <strong>{billing.payTo.easypaisaAccount}</strong> —{' '}
              {billing.payTo.easypaisaTitle}
            </p>
            <p className="mt-2">
              Then send your receipt to <strong>{billing.payTo.whatsappReceipt}</strong> on WhatsApp.
              Access is restored once the platform records it.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Please contact your school administrator.</p>
        )}
      </Card>
    </div>
  );
}
