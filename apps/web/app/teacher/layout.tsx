'use client';

import { Role } from '@sms/shared';
import type { ReactNode } from 'react';
import { BillingGate } from '@/components/billing-gate';
import { Shell } from '@/components/shell';
import { useRequireRole } from '@/lib/auth';

const nav = [
  { href: '/teacher', label: 'My Classes' },
  { href: '/teacher/attendance', label: 'Attendance' },
  { href: '/teacher/assignments', label: 'Assignments' },
  { href: '/teacher/grades', label: 'Grades' },
];

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { allowed } = useRequireRole(Role.TEACHER);
  return (
    <Shell title="Teacher" nav={nav} ready={allowed}>
      {allowed ? <BillingGate>{children}</BillingGate> : null}
    </Shell>
  );
}
