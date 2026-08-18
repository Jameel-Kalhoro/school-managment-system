'use client';

import { useState } from 'react';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Spinner } from '@/components/ui';
import { teachersApi } from '@/lib/api';
import type { CreateTeacherResult } from '@/lib/types';
import { useAsync } from '@/lib/use-async';

export default function TeachersPage() {
  const teachers = useAsync(() => teachersApi.list());
  const [showForm, setShowForm] = useState(false);
  const [created, setCreated] = useState<CreateTeacherResult | null>(null);

  return (
    <div>
      <PageHeader
        title="Teachers"
        action={
          <Button onClick={() => { setShowForm((v) => !v); setCreated(null); }}>
            {showForm ? 'Close' : 'Add teacher'}
          </Button>
        }
      />

      {created && (
        <Card className="mb-4 border-emerald-200">
          <Alert tone="success">
            Created <strong>{created.teacher.user.name}</strong>. One-time password:
            <span className="ml-1 font-mono text-xs">{created.tempPassword}</span> — they can
            log in and will be asked to change it.
          </Alert>
        </Card>
      )}

      {showForm && (
        <TeacherForm onDone={(r) => { setCreated(r); setShowForm(false); teachers.reload(); }} />
      )}

      {teachers.loading ? (
        <Spinner />
      ) : teachers.error ? (
        <Alert>{teachers.error}</Alert>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Qualification</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.data?.data.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{t.user.name}</td>
                  <td className="px-4 py-3 text-slate-500">{t.user.email}</td>
                  <td className="px-4 py-3 text-slate-500">{t.qualification ?? '—'}</td>
                  <td className="px-4 py-3"><Badge>{t.status}</Badge></td>
                  <td className="px-4 py-3">
                    <Button
                      variant={t.status === 'ACTIVE' ? 'danger' : 'ghost'}
                      onClick={async () => {
                        await teachersApi.setStatus(t.id, t.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
                        teachers.reload();
                      }}
                    >
                      {t.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
              {teachers.data?.data.length === 0 && (
                <tr><td className="px-4 py-3 text-slate-400" colSpan={5}>No teachers yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function TeacherForm({ onDone }: { onDone: (r: CreateTeacherResult) => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', qualification: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await teachersApi.create({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        qualification: form.qualification || undefined,
      });
      onDone(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create teacher');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={form.name} onChange={set('name')} required />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={set('email')} required />
        </Field>
        <Field label="Phone (optional)">
          <Input value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Qualification (optional)">
          <Input value={form.qualification} onChange={set('qualification')} />
        </Field>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create teacher'}</Button>
        </div>
      </form>
    </Card>
  );
}
