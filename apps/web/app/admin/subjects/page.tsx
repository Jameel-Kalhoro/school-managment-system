'use client';

import { useState } from 'react';
import { Alert, Button, Card, Field, Input, PageHeader, Spinner } from '@/components/ui';
import { subjectsApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function SubjectsPage() {
  const subjects = useAsync(() => subjectsApi.list());
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <PageHeader
        title="Subjects"
        action={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'Add subject'}</Button>}
      />

      {showForm && <SubjectForm onDone={() => { setShowForm(false); subjects.reload(); }} />}

      {subjects.loading ? (
        <Spinner />
      ) : subjects.error ? (
        <Alert>{subjects.error}</Alert>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.data?.data.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.code ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="danger"
                      onClick={async () => { await subjectsApi.remove(s.id); subjects.reload(); }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {subjects.data?.data.length === 0 && (
                <tr><td className="px-4 py-3 text-slate-400" colSpan={3}>No subjects yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function SubjectForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: '', code: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await subjectsApi.create({ name: form.name, code: form.code || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subject');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </Field>
        <Field label="Code (optional)">
          <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
        </Field>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Create subject'}</Button>
        </div>
      </form>
    </Card>
  );
}
