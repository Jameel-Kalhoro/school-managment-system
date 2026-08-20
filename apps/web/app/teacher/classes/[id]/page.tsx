'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Select, Spinner } from '@/components/ui';
import { teacherPortalApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function TeacherRosterPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const roster = useAsync(() => teacherPortalApi.classRoster(id), [id]);
  const classes = useAsync(() => teacherPortalApi.myClasses());
  const [showForm, setShowForm] = useState(false);

  // Only the class teacher can add students; subject teachers get a read-only roster.
  const isClassTeacher = classes.data?.find((c) => c.id === id)?.isClassTeacher ?? false;

  return (
    <div>
      <div className="mb-2">
        <Link href="/teacher" className="text-sm text-slate-500 underline">← My Classes</Link>
      </div>
      <PageHeader
        title="Class Roster"
        action={
          isClassTeacher ? (
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'Add student'}</Button>
          ) : undefined
        }
      />

      {showForm && isClassTeacher && (
        <AddStudentForm classId={id} onDone={() => { setShowForm(false); roster.reload(); }} />
      )}

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
                <th className="px-4 py-3 font-medium">Guardian</th>
                <th className="px-4 py-3 font-medium">Gender</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {roster.data?.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.rollNo}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.guardianName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{s.gender ?? '—'}</td>
                  <td className="px-4 py-3"><Badge>{s.status}</Badge></td>
                </tr>
              ))}
              {roster.data?.length === 0 && (
                <tr><td className="px-4 py-3 text-slate-400" colSpan={5}>No students in this class.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function AddStudentForm({ classId, onDone }: { classId: string; onDone: () => void }) {
  const [form, setForm] = useState({ rollNo: '', name: '', gender: '', guardianName: '', guardianPhone: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await teacherPortalApi.addStudent(classId, {
        rollNo: form.rollNo,
        name: form.name,
        gender: form.gender || undefined,
        guardianName: form.guardianName,
        guardianPhone: form.guardianPhone || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add student');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Roll No">
          <Input value={form.rollNo} onChange={set('rollNo')} required />
        </Field>
        <Field label="Name">
          <Input value={form.name} onChange={set('name')} required />
        </Field>
        <Field label="Gender (optional)">
          <Select value={form.gender} onChange={set('gender')}>
            <option value="">—</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
        <div className="hidden sm:block" />
        <Field label="Guardian name">
          <Input value={form.guardianName} onChange={set('guardianName')} required />
        </Field>
        <Field label="Guardian phone (optional)">
          <Input value={form.guardianPhone} onChange={set('guardianPhone')} />
        </Field>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add student'}</Button>
        </div>
      </form>
    </Card>
  );
}
