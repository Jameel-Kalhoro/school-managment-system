'use client';

import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  SecretField,
  Spinner,
} from '@/components/ui';
import { parentsApi, studentsApi } from '@/lib/api';
import type { CreateParentResult, Student } from '@/lib/types';
import { useAsync } from '@/lib/use-async';

export default function ParentsPage() {
  const parents = useAsync(() => parentsApi.list());
  const [showForm, setShowForm] = useState(false);
  const [created, setCreated] = useState<CreateParentResult | null>(null);

  return (
    <div>
      <PageHeader
        title="Parents"
        action={
          <Button onClick={() => { setShowForm((v) => !v); setCreated(null); }}>
            {showForm ? 'Close' : 'Add parent'}
          </Button>
        }
      />

      {created && (
        <Card className="mb-4 border-emerald-200">
          <Alert tone="success">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Created <strong>{created.parent.name}</strong> ({created.parent.children.length}{' '}
                child{created.parent.children.length === 1 ? '' : 'ren'} linked). One-time password:
              </span>
              <SecretField value={created.tempPassword} />
            </div>
          </Alert>
        </Card>
      )}

      {showForm && (
        <ParentForm onDone={(r) => { setCreated(r); setShowForm(false); parents.reload(); }} />
      )}

      {parents.loading ? (
        <Spinner />
      ) : parents.error ? (
        <Alert>{parents.error}</Alert>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Children</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {parents.data?.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.email}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.children.length === 0
                      ? '—'
                      : p.children.map((c) => `${c.name} (${c.rollNo})`).join(', ')}
                  </td>
                  <td className="px-4 py-3"><Badge>{p.status}</Badge></td>
                </tr>
              ))}
              {parents.data?.length === 0 && (
                <tr><td className="px-4 py-3 text-slate-400" colSpan={4}>No parents yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function ParentForm({ onDone }: { onDone: (r: CreateParentResult) => void }) {
  const students = useAsync(() => studentsApi.list());
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) {
      setError('Select at least one child');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await parentsApi.create({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        studentIds: [...selected],
      });
      onDone(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create parent');
    } finally {
      setLoading(false);
    }
  }

  const list: Student[] = students.data?.data ?? [];

  return (
    <Card className="mb-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
        </Field>
        <Field label="Phone (optional)">
          <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </Field>
        <div className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Children</span>
          {students.loading ? (
            <Spinner />
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-400">No students to link. Add students first.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {list.map((s) => (
                <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                  />
                  <span className="text-slate-700">
                    {s.rollNo} · {s.name}
                    {s.class ? ` — ${s.class.name}${s.class.section ? ` ${s.class.section}` : ''}` : ''}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create parent'}</Button>
        </div>
      </form>
    </Card>
  );
}
