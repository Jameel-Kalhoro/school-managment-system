'use client';

import { useState } from 'react';
import { Alert, Card, Field, PageHeader, Select, Spinner } from '@/components/ui';
import { assignmentsApi, classesApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function AdminAssignmentsPage() {
  const classes = useAsync(() => classesApi.list());
  const [classId, setClassId] = useState('');

  const assignments = useAsync(
    () => assignmentsApi.adminList({ classId: classId || undefined }),
    [classId],
  );

  return (
    <div>
      <PageHeader title="Assignments" />

      <Card className="mb-4">
        <Field label="Class (optional)">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">All classes</option>
            {classes.data?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.section ? ` - ${c.section}` : ''}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {assignments.loading ? (
        <Spinner />
      ) : assignments.error ? (
        <Alert>{assignments.error}</Alert>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {assignments.data?.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{a.title}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {a.class ? `${a.class.name}${a.class.section ? ` - ${a.class.section}` : ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{a.subject?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {a.dueDate ? a.dueDate.slice(0, 10) : '—'}
                  </td>
                </tr>
              ))}
              {assignments.data?.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-400" colSpan={4}>
                    No assignments.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
