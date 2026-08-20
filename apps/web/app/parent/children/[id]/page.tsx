'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Alert, Badge, Card, PageHeader, Spinner } from '@/components/ui';
import { parentPortalApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function ParentChildPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const attendance = useAsync(() => parentPortalApi.childAttendance(id), [id]);
  const grades = useAsync(() => parentPortalApi.childGrades(id), [id]);
  const assignments = useAsync(() => parentPortalApi.childAssignments(id), [id]);

  return (
    <div>
      <div className="mb-2">
        <Link href="/parent" className="text-sm text-slate-500 underline">← My Children</Link>
      </div>
      <PageHeader title="Child Overview" />

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Attendance</h2>
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
                    <td className="px-4 py-3"><Badge>{a.status}</Badge></td>
                  </tr>
                ))}
                {attendance.data?.length === 0 && (
                  <tr><td className="px-4 py-3 text-slate-400" colSpan={3}>No attendance records.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Grades</h2>
        {grades.loading ? (
          <Spinner />
        ) : grades.error ? (
          <Alert>{grades.error}</Alert>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Exam</th>
                  <th className="px-4 py-3 font-medium">Marks</th>
                  <th className="px-4 py-3 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {grades.data?.map((g) => (
                  <tr key={g.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{g.subject?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{g.examType}</td>
                    <td className="px-4 py-3">{g.marksObtained}/{g.totalMarks}</td>
                    <td className="px-4 py-3 text-slate-500">{g.remarks ?? '—'}</td>
                  </tr>
                ))}
                {grades.data?.length === 0 && (
                  <tr><td className="px-4 py-3 text-slate-400" colSpan={4}>No grades recorded.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Assignments</h2>
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
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {assignments.data?.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{a.title}</td>
                    <td className="px-4 py-3 text-slate-500">{a.subject?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{a.dueDate ? a.dueDate.slice(0, 10) : '—'}</td>
                  </tr>
                ))}
                {assignments.data?.length === 0 && (
                  <tr><td className="px-4 py-3 text-slate-400" colSpan={3}>No assignments.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
