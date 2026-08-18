'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Field, PasswordInput } from '@/components/ui';
import { authApi, loadSession, saveSession } from '@/lib/api';
import { homeFor, useAuth } from '@/lib/auth';

export default function ChangePasswordPage() {
  const { user, ready, setUser } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setError('New passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.changePassword(current, next);
      // Reflect the cleared flag locally (backend also revoked the refresh token).
      const session = loadSession();
      if (session && user) {
        const updated = { ...user, mustChangePassword: false };
        saveSession({ ...session, user: updated });
        setUser(updated);
        router.replace(homeFor(updated.role));
      } else {
        router.replace('/login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">Change your password</h1>
        <p className="mt-1 text-sm text-slate-500">
          {user?.mustChangePassword
            ? 'You must set a new password before continuing.'
            : 'Update your account password.'}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Current password">
            <PasswordInput
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label="New password">
            <PasswordInput
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          <Field label="Confirm new password">
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving…' : 'Update password'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
