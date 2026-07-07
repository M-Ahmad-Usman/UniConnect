import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AdminPageHeader,
  TableSurface,
} from '@/features/admin/components/AdminDataPrimitives';
import { buildBulkImportErrorCsv, downloadTextFile } from '@/features/admin/utils';
import { useImportEnrollmentStudents } from '../hooks/useEnrollment';
import { validateCsvFile } from '../schemas';
import type { EnrollmentImportResult } from '@/types';

const CSV_TEMPLATE =
  'fullName,email,phone,gender,userType,classPublicId,rollNumber\n' +
  'John Doe,john@ntu.edu.pk,03001234567,MALE,STUDENT,018f47a2-5d6b-7c8d-9e0f-123456789abc,22-NTU-CS-1184\n';

export function EnrollmentImportPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<EnrollmentImportResult | null>(null);
  const importStudents = useImportEnrollmentStudents();

  function selectFile(nextFile: File | undefined) {
    if (!nextFile) return;
    const validationError = validateCsvFile(nextFile);
    setFileError(validationError);
    setFile(validationError ? null : nextFile);
    setResult(null);
    setProgress(0);
  }

  async function handleImport() {
    if (!file) {
      setFileError('Select a CSV file first.');
      return;
    }
    const importResult = await importStudents.mutateAsync({ file, onProgress: setProgress });
    setResult(importResult);
    setProgress(100);
  }

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <AdminPageHeader
        eyebrow="Enrollment"
        title="Import students"
        description="Upload student-only CSV rows into authorized classes."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4 rounded-lg border bg-card p-5">
          <button
            type="button"
            className="flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background px-4 text-center transition-colors hover:bg-muted/50"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              selectFile(event.dataTransfer.files[0]);
            }}
          >
            <FileSpreadsheet className="size-12 text-muted-foreground" />
            <span className="text-sm font-medium">
              {file ? file.name : 'Choose or drop a CSV file'}
            </span>
            <span className="text-xs text-muted-foreground">Max 5 MB. Student rows only.</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />

          {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}

          {importStudents.isPending || progress > 0 ? (
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{progress}% uploaded</p>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                downloadTextFile('uniconnect-students-template.csv', CSV_TEMPLATE, 'text/csv')
              }
            >
              <Download className="size-4" />
              Template
            </Button>
            <Button type="button" disabled={!file || importStudents.isPending} onClick={handleImport}>
              <Upload className="size-4" />
              {importStudents.isPending ? 'Importing...' : 'Import students'}
            </Button>
          </div>
        </div>

        <aside className="space-y-3 rounded-lg border bg-background p-4">
          <h2 className="font-semibold">Required headers</h2>
          <p className="break-words text-xs text-muted-foreground">
            fullName,email,phone,gender,userType,classPublicId,rollNumber
          </p>
          <p className="text-xs text-muted-foreground">`userType` must be STUDENT when present.</p>
        </aside>
      </div>

      {result ? (
        <div className="space-y-4 rounded-lg border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Successful" value={result.successful} />
            <Metric label="Failed" value={result.failed} />
            <Metric label="Processed" value={result.successful + result.failed} />
          </div>
          {result.errors.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Import errors</h2>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    downloadTextFile(
                      'uniconnect-enrollment-import-errors.csv',
                      buildBulkImportErrorCsv(result.errors),
                      'text/csv',
                    )
                  }
                >
                  <Download className="size-4" />
                  Download errors
                </Button>
              </div>
              <TableSurface title="Import errors">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Row</th>
                    <th className="px-3 py-2 font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.errors.map((error) => (
                    <tr key={`${error.row}-${error.message}`}>
                      <td className="px-3 py-2">{error.row}</td>
                      <td className="px-3 py-2">{error.message}</td>
                    </tr>
                  ))}
                </tbody>
              </TableSurface>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
