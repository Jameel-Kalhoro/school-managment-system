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
  Select,
  Spinner,
} from '@/components/ui';
import { platformApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import type { OnboardResult } from '@/lib/types';

export default function SchoolsPage() {
  const schools = useAsync(() => platformApi.listSchools());
  const plans = useAsync(() => platformApi.listPlans());
  const [showForm, setShowForm] = useState(false);
  const [result, setResult] = useState<OnboardResult | null>(null);

  return (
    <div>
      <PageHeader
        title="Schools"
        action={
          <Button onClick={() => { setShowForm((v) => !v); setResult(null); }}>
            {showForm ? 'Close' : 'Onboard school'}
          </Button>
        }
      />

      {result && (
        <Card className="mb-4 border-emerald-200">
          <Alert tone="success">
            <strong>{result.school.name}</strong> onboarded. Share these one-time credentials
            with the admin:
            <div className="mt-2 font-mono text-xs">
              {result.admin.email} / {result.tempPassword}
            </div>
          </Alert>
        </Card>
      )}

      {showForm && (
        <OnboardForm
          plans={(plans.data?.data ?? []).filter((p) => p.isActive)}
          onDone={(r) => {
            setResult(r);
            setShowForm(false);
            schools.reload();
          }}
        />
      )}

      {schools.loading ? (
        <Spinner />
      ) : schools.error ? (
        <Alert>{schools.error}</Alert>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <Th>School</Th>
                <Th>Plan</Th>
                <Th>Users</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {schools.data?.data.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <Td>
                    <div className="font-medium text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-400">/{s.slug} · {s.city ?? '—'}</div>
                  </Td>
                  <Td>{s.subscription?.plan?.name ?? '—'}</Td>
                  <Td>{s._count?.users ?? 0}</Td>
                  <Td><Badge>{s.status}</Badge></Td>
                  <Td>
                    {s.status === 'ACTIVE' ? (
                      <Button
                        variant="danger"
                        onClick={async () => {
                          await platformApi.setSchoolStatus(s.id, 'SUSPENDED');
                          schools.reload();
                        }}
                      >
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          await platformApi.setSchoolStatus(s.id, 'ACTIVE');
                          schools.reload();
                        }}
                      >
                        Reactivate
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
              {schools.data?.data.length === 0 && (
                <tr>
                  <Td colSpan={5}>
                    <span className="text-slate-400">No schools yet.</span>
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function OnboardForm({
  plans,
  onDone,
}: {
  plans: { id: string; name: string }[];
  onDone: (r: OnboardResult) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    city: '',
    adminName: '',
    adminEmail: '',
    planId: '',
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
      const r = await platformApi.onboardSchool({
        school: { name: form.name, slug: form.slug, city: form.city || undefined },
        admin: { name: form.adminName, email: form.adminEmail },
        planId: form.planId || plans[0]?.id,
      });
      onDone(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to onboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="School name">
          <Input value={form.name} onChange={set('name')} required />
        </Field>
        <Field label="Slug (a-z, 0-9, -)">
          <Input value={form.slug} onChange={set('slug')} pattern="[a-z0-9-]+" required />
        </Field>
        <Field label="City">
          <Input value={form.city} onChange={set('city')} />
        </Field>
        <Field label="Plan">
          <Select value={form.planId} onChange={set('planId')} required>
            <option value="">Select a plan…</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Admin name">
          <Input value={form.adminName} onChange={set('adminName')} required />
        </Field>
        <Field label="Admin email">
          <Input type="email" value={form.adminEmail} onChange={set('adminEmail')} required />
        </Field>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Onboarding…' : 'Create school + admin'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}
function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return <td className="px-4 py-3 align-top" colSpan={colSpan}>{children}</td>;
}
