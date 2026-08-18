'use client';

import { Card, PageHeader, Spinner } from '@/components/ui';
import { schoolApi, usersApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function AdminOverview() {
  const school = useAsync(() => schoolApi.getSettings());
  const users = useAsync(() => usersApi.list());
  const years = useAsync(() => schoolApi.listAcademicYears());

  const teachers = users.data?.data.filter((u) => u.role === 'TEACHER').length ?? 0;
  const students = users.data?.data.filter((u) => u.role === 'STUDENT').length ?? 0;
  const current = years.data?.find((y) => y.isCurrent);

  return (
    <div>
      <PageHeader title={school.data ? school.data.name : 'Overview'} />
      {school.loading || users.loading || years.loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Users" value={users.data?.total ?? 0} sub={`${teachers} teachers · ${students} students`} />
          <Stat label="Academic years" value={years.data?.length ?? 0} sub={current ? `Current: ${current.name}` : 'None set'} />
          <Stat label="Subscription" value={school.data?.subscription?.plan?.name ?? '—'} sub={school.data?.subscription?.status} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}
