import { randomUUID } from 'node:crypto';

const UNSAFE_FILENAME_CHARS = /[^a-zA-Z0-9._-]+/g;

export function sanitizeFileName(fileName: string): string {
  const baseName = fileName.split(/[/\\]/).pop() ?? fileName;
  const sanitized = baseName.trim().replace(UNSAFE_FILENAME_CHARS, '-');

  return sanitized.length > 0 ? sanitized.slice(0, 200) : 'file';
}

export function generateUploadObjectKey(
  tenantId: string,
  fileName: string,
): string {
  const sanitized = sanitizeFileName(fileName);
  return `tenant/${tenantId}/uploads/${randomUUID()}-${sanitized}`;
}

export function generateExportObjectKey(
  tenantId: string,
  fileName: string,
): string {
  const sanitized = sanitizeFileName(fileName);
  return `tenant/${tenantId}/exports/${randomUUID()}-${sanitized}`;
}

export function isObjectKeyForTenant(
  objectKey: string,
  tenantId: string,
): boolean {
  return objectKey.startsWith(`tenant/${tenantId}/uploads/`);
}
