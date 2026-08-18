'use client';

import { useState } from 'react';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Spinner } from '@/components/ui';
import { platformApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function PlansPage() {
  const plans = useAsync(() => platformApi.listPlans());
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <PageHeader
        title="Subscription Plans"
        action={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'New plan'}</Button>}
      />

      {showForm && <PlanForm onDone={() => { setShowForm(false); plans.reload(); }} />}

      {plans.loading ? (
        <Spinner />
      ) : plans.error ? (
        <Alert>{plans.error}</Alert>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Price (PKR/mo)</th>
                <th className="px-4 py-3 font-medium">Limits</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.data?.data.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3">{p.pricePkr.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {p.maxStudents ?? '∞'} students · {p.maxTeachers ?? '∞'} teachers
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{p.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await platformApi.setPlanStatus(p.id, !p.isActive);
                        plans.reload();
                      }}
                    >
                      {p.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function PlanForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: '', pricePkr: '', maxStudents: '', maxTeachers: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await platformApi.createPlan({
        name: form.name,
        pricePkr: Number(form.pricePkr),
        maxStudents: form.maxStudents ? Number(form.maxStudents) : undefined,
        maxTeachers: form.maxTeachers ? Number(form.maxTeachers) : undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
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
        <Field label="Price (PKR / month)">
          <Input type="number" min={0} value={form.pricePkr} onChange={set('pricePkr')} required />
        </Field>
        <Field label="Max students (optional)">
          <Input type="number" min={1} value={form.maxStudents} onChange={set('maxStudents')} />
        </Field>
        <Field label="Max teachers (optional)">
          <Input type="number" min={1} value={form.maxTeachers} onChange={set('maxTeachers')} />
        </Field>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Create plan'}</Button>
        </div>
      </form>
    </Card>
  );
}
