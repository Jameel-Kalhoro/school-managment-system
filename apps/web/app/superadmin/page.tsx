'use client';

import { Card, PageHeader, Spinner } from '@/components/ui';
import { platformApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function SuperAdminOverview() {
  const schools = useAsync(() => platformApi.listSchools());
  const plans = useAsync(() => platformApi.listPlans());

  const activeSchools = schools.data?.data.filter((s) => s.status === 'ACTIVE').length ?? 0;
  const activePlans = plans.data?.data.filter((p) => p.isActive).length ?? 0;

  return (
    <div>
      <PageHeader title="Overview" />
      {schools.loading || plans.loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Schools" value={schools.data?.total ?? 0} sub={`${activeSchools} active`} />
          <Stat label="Plans" value={plans.data?.total ?? 0} sub={`${activePlans} active`} />
          <Stat
            label="Suspended schools"
            value={schools.data?.data.filter((s) => s.status === 'SUSPENDED').length ?? 0}
          />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}
