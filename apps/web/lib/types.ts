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
