'use client';

import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Select, Spinner } from '@/components/ui';
import { classesApi, studentsApi } from '@/lib/api';
import type { SchoolClass } from '@/lib/types';
import { useAsync } from '@/lib/use-async';

function classLabel(c: SchoolClass): string {
  return c.section ? `${c.name} - ${c.section}` : c.name;
}

export default function StudentsPage() {
  const [filterClass, setFilterClass] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const students = useAsync(
    () =>
      studentsApi.list({
        ...(filterClass ? { classId: filterClass } : {}),
        ...(debounced ? { search: debounced } : {}),
      }),
    [filterClass, debounced],
  );
  const classes = useAsync(() => classesApi.list());
  const [showForm, setShowForm] = useState(false);

  const classOptions = classes.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Students"
        action={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'Add student'}</Button>}
      />

      {showForm && (
        <StudentForm classes={classOptions} onDone={() => { setShowForm(false); students.reload(); }} />
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:max-w-xl sm:grid-cols-2">
        <Field label="Search">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, roll number or guardian"
          />
        </Field>
        <Field label="Filter by class">
          <Select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
            <option value="">All classes</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{classLabel(c)}</option>
            ))}
          </Select>
        </Field>
      </div>

      {students.loading ? (
        <Spinner />
      ) : students.error ? (
        <Alert>{students.error}</Alert>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Roll No</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Guardian</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.data?.data.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.rollNo}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.guardianName ?? '—'}
                    {s.guardianPhone && (
                      <div className="text-xs text-slate-400">{s.guardianPhone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={s.classId ?? ''}
                      onChange={async (e) => {
                        await studentsApi.assignClass(s.id, e.target.value || null);
                        students.reload();
                      }}
                    >
                      <option value="">Unassigned</option>
                      {classOptions.map((c) => (
                        <option key={c.id} value={c.id}>{classLabel(c)}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-3"><Badge>{s.status}</Badge></td>
                  <td className="px-4 py-3">
                    <Button
                      variant="danger"
                      onClick={async () => { await studentsApi.remove(s.id); students.reload(); }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {students.data?.data.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-400" colSpan={6}>
                    {debounced || filterClass ? 'No students match your search.' : 'No students yet.'}
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

function StudentForm({ classes, onDone }: { classes: SchoolClass[]; onDone: () => void }) {
  const [form, setForm] = useState({
    rollNo: '',
    name: '',
    gender: '',
    guardianName: '',
    guardianPhone: '',
    classId: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await studentsApi.create({
        rollNo: form.rollNo,
        name: form.name,
        gender: form.gender || undefined,
        guardianName: form.guardianName,
        guardianPhone: form.guardianPhone || undefined,
        classId: form.classId || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create student');
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
        <Field label="Class (optional)">
          <Select value={form.classId} onChange={set('classId')}>
            <option value="">Unassigned</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{classLabel(c)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Guardian name">
          <Input value={form.guardianName} onChange={set('guardianName')} required />
        </Field>
        <Field label="Guardian phone (optional)">
          <Input value={form.guardianPhone} onChange={set('guardianPhone')} />
        </Field>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Create student'}</Button>
        </div>
      </form>
    </Card>
  );
}
