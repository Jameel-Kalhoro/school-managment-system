'use client';

import Link from 'next/link';
import { Alert, Card, PageHeader, Spinner } from '@/components/ui';
import { teacherPortalApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function TeacherClassesPage() {
  const classes = useAsync(() => teacherPortalApi.myClasses());

  return (
    <div>
      <PageHeader title="My Classes" />
      {classes.loading ? (
        <Spinner />
      ) : classes.error ? (
        <Alert>{classes.error}</Alert>
      ) : classes.data && classes.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.data.map((c) => (
            <Link key={c.id} href={`/teacher/classes/${c.id}`}>
              <Card className="transition hover:border-slate-400">
                <p className="text-base font-semibold text-slate-900">
                  {c.name}{c.section ? ` - ${c.section}` : ''}
                </p>
                <p className="mt-1 text-sm text-slate-500">{c.academicYear?.name ?? ''}</p>
                <p className="mt-2 text-sm text-slate-400">{c._count?.students ?? 0} students</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">You are not assigned to any classes yet.</p>
      )}
    </div>
  );
}
