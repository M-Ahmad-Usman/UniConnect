import { UserType, type BulkImportError } from '@/types';

export const USER_PAGE_SIZE = 20;

export function parsePositiveInt(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseUserType(value: string | null) {
  if (value === UserType.ADMIN || value === UserType.TEACHER || value === UserType.STUDENT) {
    return value;
  }

  return undefined;
}

export function parseIsActive(value: string | null) {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

export function userListParamsToRecord(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );
}

export function buildBulkImportErrorCsv(errors: BulkImportError[]) {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return ['row,message', ...errors.map((error) => `${error.row},${escape(error.message)}`)].join(
    '\n',
  );
}

export function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
