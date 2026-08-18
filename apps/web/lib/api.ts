import type { AuthUser, Role, UserStatus } from '@sms/shared';
import type {
  AcademicYear,
  CreateUserResult,
  ManagedUser,
  OnboardResult,
  Paginated,
  Plan,
  School,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const SESSION_KEY = 'sms.session';

export interface Session {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// ─── session storage ────────────────────────────────────────
export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}
export function saveSession(session: Session): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
export function clearSession(): void {
  window.localStorage.removeItem(SESSION_KEY);
}

// ─── low-level fetch with one-shot refresh on 401 ───────────
interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(API_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function send(url: string, method: string, body: unknown, token?: string): Promise<Response> {
  return fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function tryRefresh(): Promise<string | null> {
  const session = loadSession();
  if (!session) return null;
  const res = await send(buildUrl('/auth/refresh'), 'POST', {
    refreshToken: session.refreshToken,
  });
  if (!res.ok) {
    clearSession();
    return null;
  }
  const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
  saveSession({ ...session, ...tokens });
  return tokens.accessToken;
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, query } = opts;
  const url = buildUrl(path, query);
  let token = auth ? loadSession()?.accessToken : undefined;

  let res = await send(url, method, body, token);
  if (res.status === 401 && auth) {
    token = (await tryRefresh()) ?? undefined;
    if (token) res = await send(url, method, body, token);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(j.message)) message = j.message.join(', ');
      else if (j.message) message = j.message;
    } catch {
      /* no body */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── typed endpoint groups ──────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<Session>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  me: () => apiFetch<AuthUser>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<void>('/auth/password', { method: 'PATCH', body: { currentPassword, newPassword } }),
  logout: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
};

export const platformApi = {
  listPlans: (search?: string) =>
    apiFetch<Paginated<Plan>>('/platform/plans', { query: { search, pageSize: 100 } }),
  createPlan: (body: {
    name: string;
    pricePkr: number;
    maxStudents?: number;
    maxTeachers?: number;
  }) => apiFetch<Plan>('/platform/plans', { method: 'POST', body }),
  setPlanStatus: (id: string, isActive: boolean) =>
    apiFetch<Plan>(`/platform/plans/${id}/status`, { method: 'PATCH', body: { isActive } }),

  listSchools: (search?: string) =>
    apiFetch<Paginated<School>>('/platform/schools', { query: { search, pageSize: 100 } }),
  getSchool: (id: string) => apiFetch<School>(`/platform/schools/${id}`),
  onboardSchool: (body: {
    school: { name: string; slug: string; address?: string; city?: string; phone?: string };
    admin: { name: string; email: string; phone?: string };
    planId: string;
  }) => apiFetch<OnboardResult>('/platform/schools', { method: 'POST', body }),
  setSchoolStatus: (id: string, status: string) =>
    apiFetch<School>(`/platform/schools/${id}/status`, { method: 'PATCH', body: { status } }),
};

export const schoolApi = {
  getSettings: () => apiFetch<School>('/school'),
  updateSettings: (body: Partial<Pick<School, 'name' | 'address' | 'city' | 'phone' | 'logoUrl'>>) =>
    apiFetch<School>('/school', { method: 'PATCH', body }),

  listAcademicYears: () => apiFetch<AcademicYear[]>('/school/academic-years'),
  createAcademicYear: (body: {
    name: string;
    startDate: string;
    endDate: string;
    isCurrent?: boolean;
  }) => apiFetch<AcademicYear>('/school/academic-years', { method: 'POST', body }),
  setCurrentAcademicYear: (id: string) =>
    apiFetch<AcademicYear>(`/school/academic-years/${id}/set-current`, { method: 'PATCH' }),
  deleteAcademicYear: (id: string) =>
    apiFetch<void>(`/school/academic-years/${id}`, { method: 'DELETE' }),
};

export const usersApi = {
  list: (params: { role?: Role; status?: UserStatus; search?: string } = {}) =>
    apiFetch<Paginated<ManagedUser>>('/users', { query: { ...params, pageSize: 100 } }),
  create: (body: { name: string; email: string; role: Role; phone?: string }) =>
    apiFetch<CreateUserResult>('/users', { method: 'POST', body }),
  setStatus: (id: string, status: UserStatus) =>
    apiFetch<ManagedUser>(`/users/${id}/status`, { method: 'PATCH', body: { status } }),
};
