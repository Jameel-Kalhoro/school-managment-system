'use client';

import Link from 'next/link';
import Papa from 'papaparse';
import { MAX_STUDENT_IMPORT_ROWS } from '@sms/shared';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Field, PageHeader, Select, Spinner } from '@/components/ui';
import { schoolApi, studentsApi } from '@/lib/api';
import type { ImportClassRef, ImportPreviewResult, ImportStudentRow } from '@/lib/types';
import { useAsync } from '@/lib/use-async';

const TEMPLATE_HEADERS = ['rollNo', 'name', 'guardianName', 'guardianPhone', 'class', 'section', 'gender'];
const TEMPLATE_SAMPLE = ['001', 'Ahmed Ali', 'Ali Raza', '03001234567', 'Grade 5', 'A', 'MALE'];

function classRefLabel(c: ImportClassRef): string {
  return c.section ? `${c.name} - ${c.section}` : c.name;
}

export default function StudentImportPage() {
  const years = useAsync(() => schoolApi.listAcademicYears());
  const [yearId, setYearId] = useState('');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportStudentRow[] | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Default to the current academic year once the list loads.
  useEffect(() => {
    if (!yearId && years.data?.length) {
      setYearId((years.data.find((y) => y.isCurrent) ?? years.data[0]).id);
    }
  }, [years.data, yearId]);

  async function runPreview(nextRows: ImportStudentRow[], academicYearId: string) {
    setBusy(true);
    setError(null);
    setPreview(null);
    setDone(null);
    try {
      setPreview(await studentsApi.previewImport({ academicYearId, rows: nextRows }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate file');
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setDone(null);
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const mapped: ImportStudentRow[] = result.data.map((r) => ({
          rollNo: (r.rollNo ?? '').trim(),
          name: (r.name ?? '').trim(),
          guardianName: (r.guardianName ?? '').trim(),
          guardianPhone: (r.guardianPhone ?? '').trim() || undefined,
          className: (r.class ?? '').trim(),
          section: (r.section ?? '').trim() || undefined,
          gender: (r.gender ?? '').trim() || undefined,
        }));
        if (mapped.length > MAX_STUDENT_IMPORT_ROWS) {
          setRows(null);
          setPreview(null);
          setError(
            `Your file has ${mapped.length} students. Please split it into files of at most ${MAX_STUDENT_IMPORT_ROWS}.`,
          );
          return;
        }
        setRows(mapped);
        if (yearId) void runPreview(mapped, yearId);
      },
      error: () => setError('Could not read the CSV file'),
    });
    e.target.value = ''; // allow re-selecting the same file
  }

  function downloadTemplate() {
    const csv = `${TEMPLATE_HEADERS.join(',')}\n${TEMPLATE_SAMPLE.join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function commit() {
    if (!rows || !yearId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await studentsApi.importStudents({ academicYearId: yearId, rows });
      setDone(
        `Imported ${res.importedStudents} student${res.importedStudents === 1 ? '' : 's'}` +
          (res.createdClasses ? ` and created ${res.createdClasses} new class(es).` : '.'),
      );
      setRows(null);
      setPreview(null);
      setFileName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  const yearList = years.data ?? [];
  const errors = preview?.errors ?? [];
  const summary = preview?.valid ? preview.summary : undefined;
  const canImport = preview?.valid === true && !busy && rows !== null;

  return (
    <div>
      <PageHeader title="Import Students" />

      <Card className="mb-4">
        <p className="mb-4 text-sm text-slate-600">
          Bulk-add students from a CSV file. Pick the academic year, download the template, fill in
          one student per row (including their class and section), then upload it — up to{' '}
          {MAX_STUDENT_IMPORT_ROWS} students per file. Classes that don&apos;t exist yet are created
          automatically. If any row has a problem, the whole file is rejected and nothing is saved.
        </p>

        {years.loading ? (
          <Spinner />
        ) : yearList.length === 0 ? (
          <Alert>
            You need an academic year first.{' '}
            <Link className="underline" href="/admin/academic-years">
              Create one
            </Link>{' '}
            then come back.
          </Alert>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Academic year">
              <Select
                value={yearId}
                onChange={(e) => {
                  setYearId(e.target.value);
                  if (rows) void runPreview(rows, e.target.value);
                }}
              >
                {yearList.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                    {y.isCurrent ? ' (current)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Template">
              <Button variant="ghost" onClick={downloadTemplate}>
                Download CSV template
              </Button>
            </Field>
            <Field label="CSV file">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={onFile}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
              />
              {fileName && <p className="mt-1 text-xs text-slate-400">{fileName}</p>}
            </Field>
          </div>
        )}
      </Card>

      {done && <Alert tone="success">{done} <Link className="underline" href="/admin/students">View students</Link></Alert>}
      {error && <Alert>{error}</Alert>}
      {busy && !preview && <Spinner />}

      {errors.length > 0 && (
        <Card className="mb-4">
          <Alert>
            Found {errors.length} problem{errors.length === 1 ? '' : 's'}. Fix them in your file and
            upload again — nothing has been saved.
          </Alert>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Column</th>
                  <th className="px-3 py-2 font-medium">Problem</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-medium text-slate-900">{e.row}</td>
                    <td className="px-3 py-2 text-slate-600">{e.column}</td>
                    <td className="px-3 py-2 text-red-600">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {summary && (
        <Card className="mb-4">
          <Alert tone="success">
            Ready to import <strong>{summary.studentsToCreate}</strong> student
            {summary.studentsToCreate === 1 ? '' : 's'}.
          </Alert>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <div className="font-medium text-slate-700">
                New classes to create ({summary.newClassesToCreate.length})
              </div>
              <div className="text-slate-500">
                {summary.newClassesToCreate.length
                  ? summary.newClassesToCreate.map(classRefLabel).join(', ')
                  : '—'}
              </div>
            </div>
            <div>
              <div className="font-medium text-slate-700">
                Existing classes used ({summary.existingClasses.length})
              </div>
              <div className="text-slate-500">
                {summary.existingClasses.length
                  ? summary.existingClasses.map(classRefLabel).join(', ')
                  : '—'}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={commit} disabled={!canImport}>
              {busy ? 'Importing…' : `Import ${summary.studentsToCreate} students`}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
