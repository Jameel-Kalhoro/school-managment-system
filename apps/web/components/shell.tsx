'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Spinner } from './ui';

export interface NavItem {
  href: string;
  label: string;
}

/** Dashboard chrome: sidebar nav + header with the signed-in user and logout. */
export function Shell({
  title,
  nav,
  ready,
  children,
}: {
  title: string;
  nav: NavItem[];
  ready: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes (e.g. tapping a link).
  useEffect(() => setOpen(false), [pathname]);

  const sidebar = (
    <>
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">School System</p>
        <p className="text-xs text-slate-500">{title}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm ${
                active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Permanent sidebar on desktop */}
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white md:flex">
        {sidebar}
      </aside>

      {/* Mobile drawer + backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 md:hidden"
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="min-w-0 flex-1 truncate text-sm text-slate-500">{user?.email}</div>
          <button
            onClick={logout}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 p-4 md:p-6">{ready ? children : <Spinner />}</main>
      </div>
    </div>
  );
}
