'use client';

import { useState } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    ghost: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'border border-red-300 bg-white text-red-600 hover:bg-red-50',
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-60 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none ${className}`}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      {action}
    </div>
  );
}

const BADGE_TONES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  TRIALING: 'bg-blue-50 text-blue-700',
  GRACE: 'bg-amber-50 text-amber-700',
  PAST_DUE: 'bg-amber-50 text-amber-700',
  SUSPENDED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
  INACTIVE: 'bg-slate-100 text-slate-600',
};

export function Badge({ children }: { children: string }) {
  const tone = BADGE_TONES[children] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {children}
    </span>
  );
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'success'; children: ReactNode }) {
  const styles =
    tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800';
  return <div className={`rounded-lg px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

export function Spinner() {
  return <div className="text-sm text-slate-400">Loading…</div>;
}

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {off ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

/** Password input with a show/hide eye toggle. Drop-in for <Input type="password">. */
export function PasswordInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className={`w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-slate-500 focus:outline-none ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        <EyeIcon off={show} />
      </button>
    </div>
  );
}

/** Copies a value to the clipboard, showing brief "Copied" feedback. */
export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

/** Masked display of a secret (e.g. a temp password) with reveal + copy. */
export function SecretField({ value }: { value: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      <code className="rounded bg-white px-2 py-1 font-mono text-xs text-slate-900">
        {show ? value : '•'.repeat(Math.max(value.length, 8))}
      </code>
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="text-slate-400 hover:text-slate-600"
        aria-label={show ? 'Hide' : 'Show'}
      >
        <EyeIcon off={show} />
      </button>
      <CopyButton value={value} />
    </span>
  );
}
