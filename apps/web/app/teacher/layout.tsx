'use client';

import { Role } from '@sms/shared';
import type { ReactNode } from 'react';
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
      {allowed ? children : null}
    </Shell>
  );
}
