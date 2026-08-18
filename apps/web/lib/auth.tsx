'use client';

import { Role, type AuthUser } from '@sms/shared';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { authApi, clearSession, loadSession, saveSession } from './api';

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  setUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Landing route for a role after login. */
export function homeFor(role: Role): string {
  if (role === Role.SUPER_ADMIN) return '/superadmin';
  if (role === Role.ADMIN) return '/admin';
  if (role === Role.TEACHER) return '/teacher';
  return '/login'; // student/parent portal — Phase 5
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (session) setUser(session.user);
    setReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await authApi.login(email, password);
    saveSession(session);
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(() => {
    void authApi.logout().catch(() => undefined);
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * Client-side route guard. Redirects to login when unauthenticated, to the
 * change-password page when a reset is required, and to the user's own home
 * when their role does not match the required one (SUPER_ADMIN passes anywhere).
 */
export function useRequireRole(required: Role): { user: AuthUser | null; allowed: boolean } {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.mustChangePassword) {
      router.replace('/change-password');
      return;
    }
    if (user.role !== required && user.role !== Role.SUPER_ADMIN) {
      router.replace(homeFor(user.role));
    }
  }, [ready, user, required, router]);

  const allowed =
    !!user &&
    !user.mustChangePassword &&
    (user.role === required || user.role === Role.SUPER_ADMIN);
  return { user, allowed };
}
