'use client';

import { useState } from 'react';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Spinner } from '@/components/ui';
import { schoolApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function AcademicYearsPage() {
  const years = useAsync(() => schoolApi.listAcademicYears());
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <PageHeader
        title="Academic Years"
        action={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'Add year'}</Button>}
      />

      {showForm && <YearForm onDone={() => { setShowForm(false); years.reload(); }} />}

      {years.loading ? (
        <Spinner />
      ) : years.error ? (
        <Alert>{years.error}</Alert>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Start</th>
                <th className="px-4 py-3 font-medium">End</th>
                <th className="px-4 py-3 font-medium">Current</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {years.data?.map((y) => (
                <tr key={y.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{y.name}</td>
                  <td className="px-4 py-3 text-slate-500">{y.startDate.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-slate-500">{y.endDate.slice(0, 10)}</td>
                  <td className="px-4 py-3">{y.isCurrent && <Badge>ACTIVE</Badge>}</td>
                  <td className="px-4 py-3 space-x-2">
                    {!y.isCurrent && (
                      <Button
                        variant="ghost"
                        onClick={async () => { await schoolApi.setCurrentAcademicYear(y.id); years.reload(); }}
                      >
                        Set current
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      onClick={async () => { await schoolApi.deleteAcademicYear(y.id); years.reload(); }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {years.data?.length === 0 && (
                <tr><td className="px-4 py-3 text-slate-400" colSpan={5}>No academic years yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function YearForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', isCurrent: false });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await schoolApi.createAcademicYear({
        name: form.name,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        isCurrent: form.isCurrent,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create academic year');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name (e.g. 2025-2026)">
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </Field>
        <div className="hidden sm:block" />
        <Field label="Start date">
          <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
        </Field>
        <Field label="End date">
          <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} required />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isCurrent}
            onChange={(e) => setForm((f) => ({ ...f, isCurrent: e.target.checked }))}
          />
          Set as current year
        </label>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Create year'}</Button>
        </div>
      </form>
    </Card>
  );
}
