'use client';

import { useState } from 'react';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Spinner } from '@/components/ui';
import { platformApi } from '@/lib/api';
import type { Plan } from '@/lib/types';
import { useAsync } from '@/lib/use-async';

export default function PlansPage() {
  const plans = useAsync(() => platformApi.listPlans());
  const [showForm, setShowForm] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);

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
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          await platformApi.setPlanStatus(p.id, !p.isActive);
                          plans.reload();
                        }}
                      >
                        {p.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="danger" onClick={() => setConfirmPlan(p)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {plans.data?.data.length === 0 && (
                <tr><td className="px-4 py-3 text-slate-400" colSpan={5}>No plans yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {confirmPlan && (
        <DeletePlanDialog
          plan={confirmPlan}
          onClose={() => setConfirmPlan(null)}
          onDeleted={() => { setConfirmPlan(null); plans.reload(); }}
        />
      )}
    </div>
  );
}

function DeletePlanDialog({
  plan,
  onClose,
  onDeleted,
}: {
  plan: Plan;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const confirmed = text.trim() === plan.name.trim();

  async function onDelete() {
    setLoading(true);
    setError(null);
    try {
      await platformApi.deletePlan(plan.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <Card className="w-full max-w-md">
        <h2 className="text-lg font-semibold text-red-700">Delete {plan.name}?</h2>
        <p className="mt-2 text-sm text-slate-600">
          This permanently removes the plan. A plan still assigned to any school cannot be
          deleted — deactivate it instead.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Type <span className="font-mono font-medium">{plan.name}</span> to confirm:
        </p>
        <Input
          className="mt-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={plan.name}
        />
        {error && <div className="mt-3"><Alert>{error}</Alert></div>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" onClick={onDelete} disabled={!confirmed || loading}>
            {loading ? 'Deleting…' : 'Delete permanently'}
          </Button>
        </div>
      </Card>
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
