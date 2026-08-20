'use client';

import { useMemo, useState } from 'react';
import { Alert, Button, Card, Field, Input, PageHeader, Select, Spinner } from '@/components/ui';
import { gradesApi, teacherPortalApi } from '@/lib/api';
import type { ExamType, SchoolClass, Student } from '@/lib/types';
import { useAsync } from '@/lib/use-async';

const EXAM_TYPES: ExamType[] = ['QUIZ', 'MIDTERM', 'FINAL', 'ASSIGNMENT'];

export default function TeacherGradesPage() {
  const classes = useAsync(() => teacherPortalApi.myClasses());
  const [classId, setClassId] = useState('');
  const [showForm, setShowForm] = useState(false);

  const roster = useAsync(
    () => (classId ? teacherPortalApi.classRoster(classId) : Promise.resolve([])),
    [classId],
  );
  const grades = useAsync(
    () => (classId ? gradesApi.teacherList({ classId }) : Promise.resolve([])),
    [classId],
  );
  const selectedClass = useMemo(
    () => classes.data?.find((c) => c.id === classId),
    [classes.data, classId],
  );

  return (
    <div>
      <PageHeader
        title="Grades"
        action={
          classId ? (
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'Add grade'}</Button>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <Field label="Class">
          <Select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setShowForm(false);
            }}
          >
            <option value="">Select a class…</option>
            {classes.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.section ? ` - ${c.section}` : ''}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {showForm && selectedClass && (
        <GradeForm
          cls={selectedClass}
          students={roster.data ?? []}
          onDone={() => {
            setShowForm(false);
            grades.reload();
          }}
        />
      )}

      {!classId ? (
        <p className="text-sm text-slate-400">Pick a class to see its grades.</p>
      ) : grades.loading ? (
        <Spinner />
      ) : grades.error ? (
        <Alert>{grades.error}</Alert>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium">Marks</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grades.data?.map((g) => (
                <tr key={g.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {g.student ? `${g.student.rollNo} · ${g.student.name}` : '—'}
                    {g.student && (
                      <div className="text-xs font-normal text-slate-400">
                        Guardian: {g.student.guardianName ?? '—'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{g.subject?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{g.examType}</td>
                  <td className="px-4 py-3">
                    {g.marksObtained}/{g.totalMarks}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="danger"
                      onClick={async () => {
                        await gradesApi.remove(g.id);
                        grades.reload();
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {grades.data?.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-400" colSpan={5}>
                    No grades recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function GradeForm({
  cls,
  students,
  onDone,
}: {
  cls: SchoolClass;
  students: Student[];
  onDone: () => void;
}) {
  const subjects = cls.classSubjects ?? [];
  const [form, setForm] = useState({
    studentId: students[0]?.id ?? '',
    subjectId: subjects[0]?.subject.id ?? '',
    examType: 'QUIZ' as ExamType,
    marksObtained: '',
    totalMarks: '',
    remarks: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await gradesApi.create({
        studentId: form.studentId,
        classId: cls.id,
        subjectId: form.subjectId,
        examType: form.examType,
        marksObtained: Number(form.marksObtained),
        totalMarks: Number(form.totalMarks),
        remarks: form.remarks || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record grade');
    } finally {
      setLoading(false);
    }
  }

  if (students.length === 0) {
    return (
      <Card className="mb-4">
        <Alert>This class has no students yet.</Alert>
      </Card>
    );
  }
  if (subjects.length === 0) {
    return (
      <Card className="mb-4">
        <Alert>This class has no subjects yet. Ask your admin to add one first.</Alert>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Student">
          <Select
            value={form.studentId}
            onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
            required
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.rollNo} · {s.name}
                {s.guardianName ? ` — ${s.guardianName}` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Subject">
          <Select
            value={form.subjectId}
            onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
            required
          >
            {subjects.map((cs) => (
              <option key={cs.id} value={cs.subject.id}>
                {cs.subject.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Exam type">
          <Select
            value={form.examType}
            onChange={(e) => setForm((f) => ({ ...f, examType: e.target.value as ExamType }))}
          >
            {EXAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <div className="hidden sm:block" />
        <Field label="Marks obtained">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.marksObtained}
            onChange={(e) => setForm((f) => ({ ...f, marksObtained: e.target.value }))}
            required
          />
        </Field>
        <Field label="Total marks">
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={form.totalMarks}
            onChange={(e) => setForm((f) => ({ ...f, totalMarks: e.target.value }))}
            required
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Remarks (optional)">
            <Input
              value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
            />
          </Field>
        </div>
        {error && (
          <div className="sm:col-span-2">
            <Alert>{error}</Alert>
          </div>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Record grade'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
