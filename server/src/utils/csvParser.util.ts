import { ApiError } from './apiError.js';

export interface ParsedCsvResult {
  headers: string[];
  normalizedHeaders: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

/**
 * Normalizes a header label for flexible matching (e.g., "Name*", " First Name ", "Employee ID" -> "name", "firstname", "employeeid")
 */
export const normalizeHeader = (header: string): string => {
  return header
    .replace(/[*"'`]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, '');
};

/**
 * Safely sanitizes uploaded filenames, stripping path traversal sequences and unwanted characters
 */
export const sanitizeCsvFilename = (filename: string): string => {
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/\.\.+/g, '.')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .slice(0, 150);
};

/**
 * Safely parses RFC-4180 compliant CSV string into row objects
 * Handles quoted fields, embedded commas, doubled quotes, and CRLF/LF line endings.
 */
export const parseCsvString = (
  csvContent: string,
  maxRows: number = 1000
): ParsedCsvResult => {
  if (!csvContent || typeof csvContent !== 'string' || csvContent.trim().length === 0) {
    throw ApiError.badRequest('Uploaded CSV file is empty or contains no readable text.');
  }

  const rawLines: string[] = [];
  let currentLine = '';
  let insideQuote = false;

  // Split into lines while respecting quoted newlines
  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentLine += '""';
        i++; // skip escaped quote in outer line collector
      } else {
        insideQuote = !insideQuote;
        currentLine += '"';
      }
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip LF after CR
      }
      if (currentLine.trim().length > 0) {
        rawLines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim().length > 0) {
    rawLines.push(currentLine);
  }

  if (rawLines.length < 1) {
    throw ApiError.badRequest('CSV file must contain at least a header row.');
  }

  // Parse a single CSV line into an array of cell values
  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());
    return cells;
  };

  const rawHeaders = parseLine(rawLines[0]);
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  if (rawLines.length > maxRows + 1) {
    throw ApiError.badRequest(
      `CSV file exceeds maximum limit of ${maxRows} rows. Please split the file into smaller batches.`
    );
  }

  const rows: Record<string, string>[] = [];

  for (let r = 1; r < rawLines.length; r++) {
    const cells = parseLine(rawLines[r]);
    // Skip empty lines
    if (cells.length === 0 || (cells.length === 1 && cells[0] === '')) {
      continue;
    }

    const rowObj: Record<string, string> = {};
    for (let h = 0; h < normalizedHeaders.length; h++) {
      const key = normalizedHeaders[h];
      const val = cells[h] !== undefined ? cells[h].trim() : '';
      rowObj[key] = val;
    }
    rows.push(rowObj);
  }

  return {
    headers: rawHeaders,
    normalizedHeaders,
    rows,
    totalRows: rows.length,
  };
};
