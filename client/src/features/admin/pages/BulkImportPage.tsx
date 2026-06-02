import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { getApiErrorMessage } from '@/features/auth/utils';
import { useBulkImportUsers } from '../hooks/useBulkImportUsers';
import { buildBulkImportErrorCsv, downloadTextFile } from '../utils';
import { validateCsvFile } from '../schemas';
import type { BulkImportResult } from '@/types';

const CSV_TEMPLATE =
  'fullName,email,phone,gender,userType,departmentId,classPublicId,rollNumber,designation\n' +
  'John Doe,john@ntu.edu.pk,03001234567,MALE,STUDENT,1,1,22-NTU-CS-1184,\n' +
  'Jane Smith,jane@ntu.edu.pk,03009876543,FEMALE,TEACHER,1,,,Lecturer\n';

export function BulkImportPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const importUsers = useBulkImportUsers();

  function selectFile(nextFile: File | undefined) {
    if (!nextFile) {
      return;
    }

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

    try {
      const importResult = await importUsers.mutateAsync({
        file,
        onProgress: setProgress,
      });
      setResult(importResult);
      setProgress(100);
      toast.success('Bulk import completed.');
    } catch (error) {
      setFileError(getApiErrorMessage(error, 'Unable to import users right now.'));
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Bulk import users</h1>
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with student, teacher, or admin rows.
          </p>
        </div>
        <Button variant="outline" render={<Link to={ROUTES.ADMIN_USERS} />}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

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
            <span className="text-xs text-muted-foreground">
              Max 5 MB. Use the documented column headers.
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />

          {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}

          {importUsers.isPending || progress > 0 ? (
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{progress}% uploaded</p>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                downloadTextFile('uniconnect-users-template.csv', CSV_TEMPLATE, 'text/csv')
              }
            >
              <Download className="size-4" />
              Template
            </Button>
            <Button type="button" disabled={!file || importUsers.isPending} onClick={handleImport}>
              <Upload className="size-4" />
              {importUsers.isPending ? 'Importing...' : 'Import users'}
            </Button>
          </div>
        </div>

        <aside className="space-y-3 rounded-lg border bg-background p-4">
          <h2 className="font-semibold">Required headers</h2>
          <p className="break-words text-xs text-muted-foreground">
            fullName,email,phone,gender,userType,departmentId,classPublicId,rollNumber,designation
          </p>
          <p className="text-xs text-muted-foreground">
            Student roll numbers use NTU format, for example 22-NTU-CS-1184.
          </p>
        </aside>
      </div>

      {result ? (
        <div className="space-y-4 rounded-lg border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Successful</p>
              <p className="text-2xl font-semibold">{result.successful}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-2xl font-semibold">{result.failed}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Processed</p>
              <p className="text-2xl font-semibold">{result.successful + result.failed}</p>
            </div>
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
                      'uniconnect-import-errors.csv',
                      buildBulkImportErrorCsv(result.errors),
                      'text/csv',
                    )
                  }
                >
                  <Download className="size-4" />
                  Download errors
                </Button>
              </div>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
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
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
