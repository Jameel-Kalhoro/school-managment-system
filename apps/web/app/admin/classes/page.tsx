'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert, Button, Card, Field, Input, PageHeader, Select, Spinner } from '@/components/ui';
import { classesApi, schoolApi } from '@/lib/api';
import type { AcademicYear } from '@/lib/types';
import { useAsync } from '@/lib/use-async';

export default function ClassesPage() {
  const classes = useAsync(() => classesApi.list());
  const years = useAsync(() => schoolApi.listAcademicYears());
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <PageHeader
        title="Classes"
        action={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'Add class'}</Button>}
      />

      {showForm && (
        <ClassForm years={years.data ?? []} onDone={() => { setShowForm(false); classes.reload(); }} />
      )}

      {years.data && years.data.length === 0 && (
        <Alert>Create an academic year first (Academic Years) before adding classes.</Alert>
      )}

      {classes.loading ? (
        <Spinner />
      ) : classes.error ? (
        <Alert>{classes.error}</Alert>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Academic Year</th>
                <th className="px-4 py-3 font-medium">Class Teacher</th>
                <th className="px-4 py-3 font-medium">Students</th>
                <th className="px-4 py-3 font-medium">Subjects</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {classes.data?.data.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {c.name}{c.section ? ` - ${c.section}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.academicYear?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.classTeacher?.user.name ?? '—'}</td>
                  <td className="px-4 py-3">{c._count?.students ?? 0}</td>
                  <td className="px-4 py-3">{c._count?.classSubjects ?? 0}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/classes/${c.id}`} className="text-sm font-medium text-slate-900 underline">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {classes.data?.data.length === 0 && (
                <tr><td className="px-4 py-3 text-slate-400" colSpan={6}>No classes yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function ClassForm({ years, onDone }: { years: AcademicYear[]; onDone: () => void }) {
  const [form, setForm] = useState({ academicYearId: '', name: '', section: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await classesApi.create({
        academicYearId: form.academicYearId,
        name: form.name,
        section: form.section || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Academic Year">
          <Select
            value={form.academicYearId}
            onChange={(e) => setForm((f) => ({ ...f, academicYearId: e.target.value }))}
            required
          >
            <option value="">Select…</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? ' (current)' : ''}</option>
            ))}
          </Select>
        </Field>
        <Field label="Name (e.g. Grade 5)">
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </Field>
        <Field label="Section (optional)">
          <Input value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))} />
        </Field>
        {error && <div className="sm:col-span-3"><Alert>{error}</Alert></div>}
        <div className="sm:col-span-3">
          <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Create class'}</Button>
        </div>
      </form>
    </Card>
  );
}
