'use client';

import { Role } from '@sms/shared';
import type { ReactNode } from 'react';
import { Shell } from '@/components/shell';
import { useRequireRole } from '@/lib/auth';

const nav = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/teachers', label: 'Teachers' },
  { href: '/admin/classes', label: 'Classes' },
  { href: '/admin/subjects', label: 'Subjects' },
  { href: '/admin/students', label: 'Students' },
  { href: '/admin/attendance', label: 'Attendance' },
  { href: '/admin/assignments', label: 'Assignments' },
  { href: '/admin/grades', label: 'Grades' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/academic-years', label: 'Academic Years' },
  { href: '/admin/settings', label: 'School Settings' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { allowed } = useRequireRole(Role.ADMIN);
  return (
    <Shell title="School Admin" nav={nav} ready={allowed}>
      {allowed ? children : null}
    </Shell>
  );
}
