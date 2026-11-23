import { BadRequestException } from '@nestjs/common';

/** Sum of declared uncompressed sizes an import workbook may have. */
export const MAX_XLSX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;

/** Entries in a workbook archive (real workbooks have a few dozen). */
export const MAX_XLSX_ENTRIES = 2000;

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const EOCD_MIN_LENGTH = 22;
const CENTRAL_HEADER_LENGTH = 46;
/** EOCD record + the longest possible archive comment. */
const EOCD_SEARCH_WINDOW = EOCD_MIN_LENGTH + 0xffff;
const ZIP64_MARKER = 0xffffffff;

function unreadable(): BadRequestException {
  return new BadRequestException(
    'Could not read the Excel file. Save it as .xlsx and try again.',
  );
}

/**
 * Zip-bomb guard run before exceljs inflates anything: reads the archive's
 * central directory and rejects workbooks whose declared uncompressed size or
 * entry count is absurd for a lead list. ZIP64 archives (only needed past
 * 4 GB) are rejected outright. Declared sizes can be forged, so this is a
 * first line of defence; the upload size cap and the row cap still apply.
 */
export function assertSafeXlsxArchive(
  buffer: Buffer,
  limits: { maxUncompressedBytes?: number; maxEntries?: number } = {},
): void {
  const maxBytes = limits.maxUncompressedBytes ?? MAX_XLSX_UNCOMPRESSED_BYTES;
  const maxEntries = limits.maxEntries ?? MAX_XLSX_ENTRIES;

  if (buffer.length < EOCD_MIN_LENGTH) throw unreadable();

  let eocd = -1;
  const stop = Math.max(0, buffer.length - EOCD_SEARCH_WINDOW);
  for (let offset = buffer.length - EOCD_MIN_LENGTH; offset >= stop; offset--) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
      eocd = offset;
      break;
    }
  }
  if (eocd === -1) throw unreadable();

  const entryCount = buffer.readUInt16LE(eocd + 10);
  const directorySize = buffer.readUInt32LE(eocd + 12);
  const directoryOffset = buffer.readUInt32LE(eocd + 16);

  if (
    entryCount === 0xffff ||
    directorySize === ZIP64_MARKER ||
    directoryOffset === ZIP64_MARKER
  ) {
    throw new BadRequestException('This Excel file is too large to import');
  }
  if (entryCount === 0 || directoryOffset + directorySize > eocd) {
    throw unreadable();
  }
  if (entryCount > maxEntries) {
    throw new BadRequestException('This Excel file is too large to import');
  }

  let total = 0;
  let offset = directoryOffset;
  for (let index = 0; index < entryCount; index++) {
    if (
      offset + CENTRAL_HEADER_LENGTH > eocd ||
      buffer.readUInt32LE(offset) !== CENTRAL_HEADER_SIGNATURE
    ) {
      throw unreadable();
    }

    const uncompressed = buffer.readUInt32LE(offset + 24);
    if (uncompressed === ZIP64_MARKER) {
      throw new BadRequestException('This Excel file is too large to import');
    }

    total += uncompressed;
    if (total > maxBytes) {
      throw new BadRequestException(
        'This Excel file expands to too much data to import. Split it into smaller files.',
      );
    }

    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    offset += CENTRAL_HEADER_LENGTH + nameLength + extraLength + commentLength;
  }
}
