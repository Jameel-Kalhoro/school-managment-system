'use client';

import { useMemo, useState } from 'react';
import { Alert, Button, Card, Field, Input, PageHeader, Select, Spinner } from '@/components/ui';
import { assignmentsApi, teacherPortalApi } from '@/lib/api';
import type { SchoolClass } from '@/lib/types';
import { useAsync } from '@/lib/use-async';

export default function TeacherAssignmentsPage() {
  const classes = useAsync(() => teacherPortalApi.myClasses());
  const [classId, setClassId] = useState('');
  const [showForm, setShowForm] = useState(false);

  const assignments = useAsync(
    () => (classId ? assignmentsApi.teacherList({ classId }) : Promise.resolve([])),
    [classId],
  );
  const selectedClass = useMemo(
    () => classes.data?.find((c) => c.id === classId),
    [classes.data, classId],
  );

  return (
    <div>
      <PageHeader
        title="Assignments"
        action={
          classId ? (
            <Button onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Close' : 'New assignment'}
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <Field label="Class">
          <Select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setShowForm(false);
            }}
          >
            <option value="">Select a class…</option>
            {classes.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.section ? ` - ${c.section}` : ''}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {showForm && selectedClass && (
        <AssignmentForm
          cls={selectedClass}
          onDone={() => {
            setShowForm(false);
            assignments.reload();
          }}
        />
      )}

      {!classId ? (
        <p className="text-sm text-slate-400">Pick a class to see its assignments.</p>
      ) : assignments.loading ? (
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
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.data?.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{a.title}</td>
                  <td className="px-4 py-3 text-slate-500">{a.subject?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {a.dueDate ? a.dueDate.slice(0, 10) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="danger"
                      onClick={async () => {
                        await assignmentsApi.remove(a.id);
                        assignments.reload();
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {assignments.data?.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-400" colSpan={4}>
                    No assignments yet.
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

function AssignmentForm({ cls, onDone }: { cls: SchoolClass; onDone: () => void }) {
  const subjects = cls.classSubjects ?? [];
  const [form, setForm] = useState({
    subjectId: subjects[0]?.subject.id ?? '',
    title: '',
    description: '',
    dueDate: '',
    attachmentUrl: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await assignmentsApi.create({
        classId: cls.id,
        subjectId: form.subjectId,
        title: form.title,
        description: form.description || undefined,
        dueDate: form.dueDate || undefined,
        attachmentUrl: form.attachmentUrl || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  }

  if (subjects.length === 0) {
    return (
      <Card className="mb-4">
        <Alert>This class has no subjects yet. Ask your admin to add one first.</Alert>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </Field>
        <Field label="Subject">
          <Select
            value={form.subjectId}
            onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
            required
          >
            {subjects.map((cs) => (
              <option key={cs.id} value={cs.subject.id}>
                {cs.subject.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Due date (optional)">
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </Field>
        <Field label="Attachment URL (optional)">
          <Input
            value={form.attachmentUrl}
            onChange={(e) => setForm((f) => ({ ...f, attachmentUrl: e.target.value }))}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description (optional)">
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </Field>
        </div>
        {error && (
          <div className="sm:col-span-2">
            <Alert>{error}</Alert>
          </div>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Create assignment'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
