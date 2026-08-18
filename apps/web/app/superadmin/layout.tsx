'use client';

import { Role } from '@sms/shared';
import type { ReactNode } from 'react';
import { Shell } from '@/components/shell';
import { useRequireRole } from '@/lib/auth';

const nav = [
  { href: '/superadmin', label: 'Overview' },
  { href: '/superadmin/schools', label: 'Schools' },
  { href: '/superadmin/plans', label: 'Plans' },
];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const { allowed } = useRequireRole(Role.SUPER_ADMIN);
  return (
    <Shell title="Super Admin" nav={nav} ready={allowed}>
      {allowed ? children : null}
    </Shell>
  );
}
