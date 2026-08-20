'use client';

import { Role } from '@sms/shared';
import type { ReactNode } from 'react';
import { BillingGate } from '@/components/billing-gate';
import { Shell } from '@/components/shell';
import { useRequireRole } from '@/lib/auth';

const nav = [{ href: '/parent', label: 'My Children' }];

export default function ParentLayout({ children }: { children: ReactNode }) {
  const { allowed } = useRequireRole(Role.PARENT);
  return (
    <Shell title="Parent" nav={nav} ready={allowed}>
      {allowed ? <BillingGate>{children}</BillingGate> : null}
    </Shell>
  );
}
