'use client';

import { Role, UserStatus } from '@sms/shared';
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
  Select,
  Spinner,
} from '@/components/ui';
import { loadSession, usersApi } from '@/lib/api';
import type { CreateUserResult } from '@/lib/types';
import { useAsync } from '@/lib/use-async';

// Teachers are provisioned from the Teachers section (which creates their
// profile too); the generic Users form only creates Admin and Parent logins.
const ASSIGNABLE: Role[] = [Role.ADMIN, Role.PARENT];

export default function UsersPage() {
  const users = useAsync(() => usersApi.list());
  const [showForm, setShowForm] = useState(false);
  const [created, setCreated] = useState<CreateUserResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const myId = loadSession()?.user.id;

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete ${name}? Their teacher/student profile and role assignments will be freed. This cannot be undone.`)) {
      return;
    }
    setError(null);
    try {
      await usersApi.remove(id);
      users.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        action={
          <Button onClick={() => { setShowForm((v) => !v); setCreated(null); }}>
            {showForm ? 'Close' : 'Add user'}
          </Button>
        }
      />

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      {created && (
        <Card className="mb-4 border-emerald-200">
          <Alert tone="success">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Created <strong>{created.user.name}</strong> ({created.user.role}). One-time password:
              </span>
              <SecretField value={created.tempPassword} />
            </div>
          </Alert>
        </Card>
      )}

      {showForm && (
        <UserForm onDone={(r) => { setCreated(r); setShowForm(false); users.reload(); }} />
      )}

      {users.loading ? (
        <Spinner />
      ) : users.error ? (
        <Alert>{users.error}</Alert>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.data?.data.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3"><Badge>{u.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant={u.status === 'ACTIVE' ? 'ghost' : 'ghost'}
                        onClick={async () => {
                          await usersApi.setStatus(
                            u.id,
                            u.status === 'ACTIVE' ? UserStatus.INACTIVE : UserStatus.ACTIVE,
                          );
                          users.reload();
                        }}
                      >
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </Button>
                      {u.id !== myId && (
                        <Button variant="danger" onClick={() => remove(u.id, u.name)}>
                          Delete
                        </Button>
                      )}
                    </div>
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

function UserForm({ onDone }: { onDone: (r: CreateUserResult) => void }) {
  const [form, setForm] = useState({ name: '', email: '', role: Role.ADMIN as Role, phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await usersApi.create({
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone || undefined,
      });
      onDone(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
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
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
        </Field>
        <Field label="Role">
          <Select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
          >
            {ASSIGNABLE.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label="Phone (optional)">
          <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </Field>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create user'}</Button>
        </div>
      </form>
    </Card>
  );
}
