import type { Role } from '@sms/shared';

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Plan {
  id: string;
  name: string;
  pricePkr: number;
  billingPeriod: string;
  maxStudents: number | null;
  maxTeachers: number | null;
  isActive: boolean;
  features?: Record<string, unknown> | null;
  createdAt: string;
}

export interface Subscription {
  status: string;
  plan?: Plan;
  currentPeriodEnd?: string | null;
}

export interface BillingStatus {
  amountPkr: number;
  dueDate: string | null;
  daysUntilDue: number | null;
  dueSoon: boolean;
  overdue: boolean;
  locked: boolean;
  status: string | null;
  payTo: {
    easypaisaAccount: string;
    easypaisaTitle: string;
    whatsappReceipt: string;
  };
}

export interface Payment {
  id: string;
  amountPkr: number;
  periodStart: string;
  periodEnd: string;
  paidAt: string;
  note: string | null;
}

export interface School {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  logoUrl: string | null;
  status: string;
  createdAt: string;
  subscription?: Subscription | null;
  _count?: { users: number; academicYears?: number };
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  phone: string | null;
  schoolId: string | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface OnboardResult {
  school: School;
  admin: ManagedUser;
  tempPassword: string;
}

export interface CreateUserResult {
  user: ManagedUser;
  tempPassword: string;
}

// ─── Academics (Phase 2a) ───────────────────────────────────

export interface Subject {
  id: string;
  name: string;
  code: string | null;
}

export interface TeacherUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
}

export interface Teacher {
  id: string;
  qualification: string | null;
  phone: string | null;
  joinedAt: string | null;
  status: string;
  user: TeacherUser;
}

export interface CreateTeacherResult {
  teacher: Teacher;
  tempPassword: string;
}

export interface ClassSubject {
  id: string;
  subject: Subject;
  teacher: { id: string; user: { id: string; name: string; email: string } } | null;
}

export interface SchoolClass {
  id: string;
  name: string;
  section: string | null;
  academicYearId: string;
  academicYear?: { id: string; name: string; isCurrent: boolean };
  classTeacherId: string | null;
  classTeacher?: { id: string; user: { id: string; name: string; email: string } } | null;
  classSubjects?: ClassSubject[];
  _count?: { students: number; classSubjects: number };
  // set on the teacher-portal myClasses response: is the current teacher the class teacher?
  isClassTeacher?: boolean;
}

export interface Student {
  id: string;
  rollNo: string;
  name: string;
  gender: string | null;
  dob: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  classId: string | null;
  class?: { id: string; name: string; section: string | null } | null;
  status: string;
}

// ─── Academics — activities (Phase 2b) ──────────────────────

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';
export type ExamType = 'QUIZ' | 'MIDTERM' | 'FINAL' | 'ASSIGNMENT';

export interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  markedById: string | null;
  student: { id: string; rollNo: string; name: string; guardianName?: string | null };
  class?: { id: string; name: string; section: string | null };
}

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  attachmentUrl: string | null;
  classId: string;
  subjectId: string;
  teacherId: string | null;
  class?: { id: string; name: string; section: string | null };
  subject?: { id: string; name: string; code: string | null };
}

export interface Grade {
  id: string;
  studentId: string;
  classId: string;
  subjectId: string;
  examType: ExamType;
  marksObtained: number;
  totalMarks: number;
  remarks: string | null;
  recordedById: string | null;
  student?: { id: string; rollNo: string; name: string; guardianName?: string | null };
  subject?: { id: string; name: string; code: string | null };
}

// ─── Parent portal (Phase 5) ────────────────────────────────

export interface ParentChild {
  id: string;
  name: string;
  rollNo: string;
  status?: string;
  class: { id: string; name: string; section: string | null } | null;
}

export interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  children: ParentChild[];
}

export interface CreateParentResult {
  parent: Parent;
  tempPassword: string;
}

// ─── CSV student import ─────────────────────────────────────
export interface ImportStudentRow {
  rollNo: string;
  name: string;
  guardianName: string;
  guardianPhone?: string;
  className: string;
  section?: string;
  gender?: string;
}

export interface ImportError {
  row: number;
  column: string;
  message: string;
}

export interface ImportClassRef {
  name: string;
  section: string | null;
}

export interface ImportPreviewResult {
  valid: boolean;
  errors?: ImportError[];
  summary?: {
    studentsToCreate: number;
    existingClasses: ImportClassRef[];
    newClassesToCreate: ImportClassRef[];
  };
}

export interface ImportCommitResult {
  importedStudents: number;
  createdClasses: number;
}

