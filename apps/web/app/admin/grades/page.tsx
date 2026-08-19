'use client';

import { useState } from 'react';
import { Alert, Card, Field, PageHeader, Select, Spinner } from '@/components/ui';
import { classesApi, gradesApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function AdminGradesPage() {
  const classes = useAsync(() => classesApi.list());
  const [classId, setClassId] = useState('');

  const grades = useAsync(
    () => gradesApi.adminList({ classId: classId || undefined }),
    [classId],
  );

  return (
    <div>
      <PageHeader title="Grades" />

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

      {grades.loading ? (
        <Spinner />
      ) : grades.error ? (
        <Alert>{grades.error}</Alert>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium">Marks</th>
                <th className="px-4 py-3 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {grades.data?.map((g) => (
                <tr key={g.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {g.student ? `${g.student.rollNo} · ${g.student.name}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{g.subject?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{g.examType}</td>
                  <td className="px-4 py-3">
                    {g.marksObtained}/{g.totalMarks}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{g.remarks ?? '—'}</td>
                </tr>
              ))}
              {grades.data?.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-400" colSpan={5}>
                    No grades.
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
