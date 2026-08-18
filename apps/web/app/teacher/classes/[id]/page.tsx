'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Alert, Badge, Card, PageHeader, Spinner } from '@/components/ui';
import { teacherPortalApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function TeacherRosterPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const roster = useAsync(() => teacherPortalApi.classRoster(id), [id]);

  return (
    <div>
      <div className="mb-2">
        <Link href="/teacher" className="text-sm text-slate-500 underline">← My Classes</Link>
      </div>
      <PageHeader title="Class Roster" />

      {roster.loading ? (
        <Spinner />
      ) : roster.error ? (
        <Alert>{roster.error}</Alert>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Roll No</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Gender</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {roster.data?.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.rollNo}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.gender ?? '—'}</td>
                  <td className="px-4 py-3"><Badge>{s.status}</Badge></td>
                </tr>
              ))}
              {roster.data?.length === 0 && (
                <tr><td className="px-4 py-3 text-slate-400" colSpan={4}>No students in this class.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
