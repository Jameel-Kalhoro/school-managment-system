'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Card, Field, PageHeader, Select, Spinner } from '@/components/ui';
import { classesApi, subjectsApi, teachersApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const cls = useAsync(() => classesApi.get(id), [id]);
  const teachers = useAsync(() => teachersApi.list());
  const subjects = useAsync(() => subjectsApi.list());

  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const teacherOptions = teachers.data?.data ?? [];
  const subjectOptions = subjects.data?.data ?? [];

  async function addSubject() {
    if (!subjectId) return;
    setError(null);
    try {
      await classesApi.addSubject(id, { subjectId, teacherId: teacherId || null });
      setSubjectId('');
      setTeacherId('');
      cls.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to attach subject');
    }
  }

  if (cls.loading) return <Spinner />;
  if (cls.error || !cls.data) return <Alert>{cls.error ?? 'Class not found'}</Alert>;

  const c = cls.data;

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/classes" className="text-sm text-slate-500 underline">← Classes</Link>
      </div>
      <PageHeader title={`${c.name}${c.section ? ` - ${c.section}` : ''}`} />
      <p className="-mt-4 mb-6 text-sm text-slate-500">Academic year: {c.academicYear?.name ?? '—'}</p>

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Class teacher</h2>
          <Field label="Assigned teacher">
            <Select
              value={c.classTeacherId ?? ''}
              onChange={async (e) => {
                await classesApi.setClassTeacher(id, e.target.value || null);
                cls.reload();
              }}
            >
              <option value="">None</option>
              {teacherOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.user.name}</option>
              ))}
            </Select>
          </Field>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Add subject</h2>
          <div className="space-y-3">
            <Field label="Subject">
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">Select subject…</option>
                {subjectOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Teacher (optional)">
              <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value="">Unassigned</option>
                {teacherOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.user.name}</option>
                ))}
              </Select>
            </Field>
            <Button onClick={addSubject} disabled={!subjectId}>Attach subject</Button>
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Teacher</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {c.classSubjects?.map((cs) => (
              <tr key={cs.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{cs.subject.name}</td>
                <td className="px-4 py-3 text-slate-500">{cs.teacher?.user.name ?? 'Unassigned'}</td>
                <td className="px-4 py-3">
                  <Button
                    variant="danger"
                    onClick={async () => { await classesApi.removeSubject(id, cs.id); cls.reload(); }}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
            {(!c.classSubjects || c.classSubjects.length === 0) && (
              <tr><td className="px-4 py-3 text-slate-400" colSpan={3}>No subjects attached yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
