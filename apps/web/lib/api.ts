import type { AuthUser, Role, UserStatus } from '@sms/shared';
import type {
  AcademicYear,
  Assignment,
  AttendanceRecord,
  AttendanceStatus,
  BillingStatus,
  ClassSubject,
  CreateParentResult,
  CreateTeacherResult,
  CreateUserResult,
  ExamType,
  Grade,
  ManagedUser,
  Parent,
  ParentChild,
  OnboardResult,
  Paginated,
  Plan,
  School,
  SchoolClass,
  Student,
  Subject,
  Teacher,
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
  deletePlan: (id: string) =>
    apiFetch<void>(`/platform/plans/${id}`, { method: 'DELETE' }),

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
  recordPayment: (id: string, body: { amountPkr?: number; note?: string } = {}) =>
    apiFetch<School>(`/platform/schools/${id}/record-payment`, { method: 'POST', body }),
  deleteSchool: (id: string) =>
    apiFetch<void>(`/platform/schools/${id}`, { method: 'DELETE' }),
};

export const billingApi = {
  status: () => apiFetch<BillingStatus>('/billing'),
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
  remove: (id: string) => apiFetch<void>(`/users/${id}`, { method: 'DELETE' }),
};

export const subjectsApi = {
  list: (search?: string) =>
    apiFetch<Paginated<Subject>>('/subjects', { query: { search, pageSize: 100 } }),
  create: (body: { name: string; code?: string }) =>
    apiFetch<Subject>('/subjects', { method: 'POST', body }),
  remove: (id: string) => apiFetch<void>(`/subjects/${id}`, { method: 'DELETE' }),
};

export const teachersApi = {
  list: (search?: string) =>
    apiFetch<Paginated<Teacher>>('/teachers', { query: { search, pageSize: 100 } }),
  create: (body: { name: string; email: string; phone?: string; qualification?: string }) =>
    apiFetch<CreateTeacherResult>('/teachers', { method: 'POST', body }),
  setStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    apiFetch<Teacher>(`/teachers/${id}/status`, { method: 'PATCH', body: { status } }),
};

export const classesApi = {
  list: (academicYearId?: string) =>
    apiFetch<Paginated<SchoolClass>>('/classes', { query: { academicYearId, pageSize: 100 } }),
  get: (id: string) => apiFetch<SchoolClass>(`/classes/${id}`),
  create: (body: { academicYearId: string; name: string; section?: string }) =>
    apiFetch<SchoolClass>('/classes', { method: 'POST', body }),
  remove: (id: string) => apiFetch<void>(`/classes/${id}`, { method: 'DELETE' }),
  setClassTeacher: (id: string, teacherId: string | null) =>
    apiFetch<SchoolClass>(`/classes/${id}/class-teacher`, { method: 'PATCH', body: { teacherId } }),
  listSubjects: (id: string) => apiFetch<ClassSubject[]>(`/classes/${id}/subjects`),
  addSubject: (id: string, body: { subjectId: string; teacherId?: string | null }) =>
    apiFetch<ClassSubject>(`/classes/${id}/subjects`, { method: 'POST', body }),
  removeSubject: (id: string, classSubjectId: string) =>
    apiFetch<void>(`/classes/${id}/subjects/${classSubjectId}`, { method: 'DELETE' }),
};

export const studentsApi = {
  list: (params: { classId?: string; search?: string } = {}) =>
    apiFetch<Paginated<Student>>('/students', { query: { ...params, pageSize: 100 } }),
  create: (body: {
    rollNo: string;
    name: string;
    gender?: string;
    guardianName?: string;
    guardianPhone?: string;
    classId?: string;
  }) => apiFetch<Student>('/students', { method: 'POST', body }),
  assignClass: (id: string, classId: string | null) =>
    apiFetch<Student>(`/students/${id}/class`, { method: 'PATCH', body: { classId } }),
  remove: (id: string) => apiFetch<void>(`/students/${id}`, { method: 'DELETE' }),
};

export const teacherPortalApi = {
  myClasses: () => apiFetch<SchoolClass[]>('/teacher/classes'),
  classRoster: (classId: string) =>
    apiFetch<Student[]>(`/teacher/classes/${classId}/students`),
  addStudent: (
    classId: string,
    body: { rollNo: string; name: string; gender?: string; guardianName?: string; guardianPhone?: string },
  ) => apiFetch<Student>(`/teacher/classes/${classId}/students`, { method: 'POST', body }),
};

// ─── Phase 2b — activities ──────────────────────────────────
export const attendanceApi = {
  // teacher
  markClass: (
    classId: string,
    body: { date: string; records: { studentId: string; status: AttendanceStatus }[] },
  ) => apiFetch<AttendanceRecord[]>(`/teacher/classes/${classId}/attendance`, { method: 'POST', body }),
  teacherByDate: (classId: string, date: string) =>
    apiFetch<AttendanceRecord[]>(`/teacher/classes/${classId}/attendance`, { query: { date } }),
  // admin
  adminList: (params: { classId?: string; date?: string } = {}) =>
    apiFetch<AttendanceRecord[]>('/attendance', { query: params }),
};

export const assignmentsApi = {
  teacherList: (params: { classId?: string } = {}) =>
    apiFetch<Assignment[]>('/teacher/assignments', { query: params }),
  create: (body: {
    classId: string;
    subjectId: string;
    title: string;
    description?: string;
    dueDate?: string;
    attachmentUrl?: string;
  }) => apiFetch<Assignment>('/teacher/assignments', { method: 'POST', body }),
  update: (
    id: string,
    body: { title?: string; description?: string; dueDate?: string; attachmentUrl?: string },
  ) => apiFetch<Assignment>(`/teacher/assignments/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => apiFetch<void>(`/teacher/assignments/${id}`, { method: 'DELETE' }),
  adminList: (params: { classId?: string; subjectId?: string } = {}) =>
    apiFetch<Assignment[]>('/assignments', { query: params }),
};

export const gradesApi = {
  teacherList: (params: { classId?: string; subjectId?: string; studentId?: string } = {}) =>
    apiFetch<Grade[]>('/teacher/grades', { query: params }),
  create: (body: {
    studentId: string;
    classId: string;
    subjectId: string;
    examType: ExamType;
    marksObtained: number;
    totalMarks: number;
    remarks?: string;
  }) => apiFetch<Grade>('/teacher/grades', { method: 'POST', body }),
  update: (
    id: string,
    body: { examType?: ExamType; marksObtained?: number; totalMarks?: number; remarks?: string },
  ) => apiFetch<Grade>(`/teacher/grades/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => apiFetch<void>(`/teacher/grades/${id}`, { method: 'DELETE' }),
  adminList: (params: { classId?: string; subjectId?: string; studentId?: string } = {}) =>
    apiFetch<Grade[]>('/grades', { query: params }),
};

// ─── Phase 5 — parents ──────────────────────────────────────
export const parentsApi = {
  list: () => apiFetch<Parent[]>('/parents'),
  create: (body: { name: string; email: string; phone?: string; studentIds: string[] }) =>
    apiFetch<CreateParentResult>('/parents', { method: 'POST', body }),
  setChildren: (id: string, studentIds: string[]) =>
    apiFetch<Parent>(`/parents/${id}/children`, { method: 'PATCH', body: { studentIds } }),
};

export const parentPortalApi = {
  children: () => apiFetch<ParentChild[]>('/parent/children'),
  childAttendance: (studentId: string) =>
    apiFetch<AttendanceRecord[]>(`/parent/children/${studentId}/attendance`),
  childGrades: (studentId: string) =>
    apiFetch<Grade[]>(`/parent/children/${studentId}/grades`),
  childAssignments: (studentId: string) =>
    apiFetch<Assignment[]>(`/parent/children/${studentId}/assignments`),
};
