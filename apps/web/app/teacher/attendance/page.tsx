'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Card, Field, PageHeader, Select, Spinner } from '@/components/ui';
import { attendanceApi, teacherPortalApi } from '@/lib/api';
import type { AttendanceStatus } from '@/lib/types';
import { useAsync } from '@/lib/use-async';

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE'];
const today = () => new Date().toISOString().slice(0, 10);

export default function TeacherAttendancePage() {
  const classes = useAsync(() => teacherPortalApi.myClasses());
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const roster = useAsync(
    () => (classId ? teacherPortalApi.classRoster(classId) : Promise.resolve([])),
    [classId],
  );
  const existing = useAsync(
    () => (classId ? attendanceApi.teacherByDate(classId, date) : Promise.resolve([])),
    [classId, date],
  );

  // Seed the status map (default PRESENT) whenever roster or saved marks load.
  useEffect(() => {
    if (!roster.data) return;
    const next: Record<string, AttendanceStatus> = {};
    for (const s of roster.data) next[s.id] = 'PRESENT';
    for (const a of existing.data ?? []) next[a.student.id] = a.status;
    setMarks(next);
    setSaved(false);
  }, [roster.data, existing.data]);

  async function save() {
    if (!classId || !roster.data?.length) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await attendanceApi.markClass(classId, {
        date,
        records: roster.data.map((s) => ({ studentId: s.id, status: marks[s.id] ?? 'PRESENT' })),
      });
      setSaved(true);
      existing.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Attendance" />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Class">
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Select a class…</option>
              {classes.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.section ? ` - ${c.section}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </Field>
        </div>
      </Card>

      {!classId ? (
        <p className="text-sm text-slate-400">Pick a class to mark attendance.</p>
      ) : roster.loading ? (
        <Spinner />
      ) : roster.error ? (
        <Alert>{roster.error}</Alert>
      ) : roster.data?.length === 0 ? (
        <p className="text-sm text-slate-400">No students in this class.</p>
      ) : (
        <>
          {error && <div className="mb-3"><Alert>{error}</Alert></div>}
          {saved && <div className="mb-3"><Alert tone="success">Attendance saved.</Alert></div>}
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Roll No</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.data?.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.rollNo}</td>
                    <td className="px-4 py-3">
                      {s.name}
                      <div className="text-xs font-normal text-slate-400">
                        Guardian: {s.guardianName ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        className="max-w-[10rem]"
                        value={marks[s.id] ?? 'PRESENT'}
                        onChange={(e) =>
                          setMarks((m) => ({ ...m, [s.id]: e.target.value as AttendanceStatus }))
                        }
                      >
                        {STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="mt-4">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save attendance'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
