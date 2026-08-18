'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Card, Field, Input, PageHeader, Spinner } from '@/components/ui';
import { schoolApi } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function SettingsPage() {
  const school = useAsync(() => schoolApi.getSettings());
  const [form, setForm] = useState({ name: '', address: '', city: '', phone: '' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (school.data) {
      setForm({
        name: school.data.name ?? '',
        address: school.data.address ?? '',
        city: school.data.city ?? '',
        phone: school.data.phone ?? '',
      });
    }
  }, [school.data]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      await schoolApi.updateSettings(form);
      setSaved(true);
      school.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="School Settings" />
      {school.loading ? (
        <Spinner />
      ) : (
        <Card className="max-w-xl">
          <form onSubmit={submit} className="space-y-4">
            <Field label="School name">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </Field>
            <Field label="Address">
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </Field>
            {error && <Alert>{error}</Alert>}
            {saved && <Alert tone="success">Settings saved.</Alert>}
            <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
