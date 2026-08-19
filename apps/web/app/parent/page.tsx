'use client';

import Link from 'next/link';
import { Alert, Card, PageHeader, Spinner } from '@/components/ui';
import { parentPortalApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function ParentChildrenPage() {
  const children = useAsync(() => parentPortalApi.children());

  return (
    <div>
      <PageHeader title="My Children" />
      {children.loading ? (
        <Spinner />
      ) : children.error ? (
        <Alert>{children.error}</Alert>
      ) : children.data && children.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.data.map((c) => (
            <Link key={c.id} href={`/parent/children/${c.id}`}>
              <Card className="transition hover:border-slate-400">
                <p className="text-base font-semibold text-slate-900">{c.name}</p>
                <p className="mt-1 text-sm text-slate-500">Roll No {c.rollNo}</p>
                <p className="mt-2 text-sm text-slate-400">
                  {c.class ? `${c.class.name}${c.class.section ? ` - ${c.class.section}` : ''}` : 'No class assigned'}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">No children are linked to your account yet.</p>
      )}
    </div>
  );
}
