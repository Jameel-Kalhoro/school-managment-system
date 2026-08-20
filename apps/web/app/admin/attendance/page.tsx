'use client';

import { useState } from 'react';
import { Alert, Badge, Card, Field, PageHeader, Select, Spinner } from '@/components/ui';
import { attendanceApi, classesApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function AdminAttendancePage() {
  const classes = useAsync(() => classesApi.list());
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState('');

  const attendance = useAsync(
    () => attendanceApi.adminList({ classId: classId || undefined, date: date || undefined }),
    [classId, date],
  );

  return (
    <div>
      <PageHeader title="Attendance" />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Field label="Date (optional)">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </Field>
        </div>
      </Card>

      {attendance.loading ? (
        <Spinner />
      ) : attendance.error ? (
        <Alert>{attendance.error}</Alert>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.data?.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-500">{a.date.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {a.class ? `${a.class.name}${a.class.section ? ` - ${a.class.section}` : ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {a.student.rollNo} · {a.student.name}
                    <div className="text-xs font-normal text-slate-400">
                      Guardian: {a.student.guardianName ?? '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{a.status}</Badge>
                  </td>
                </tr>
              ))}
              {attendance.data?.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-400" colSpan={4}>
                    No attendance records.
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
