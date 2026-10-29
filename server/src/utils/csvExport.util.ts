/**
 * Sanitizes cell values to prevent CSV formula injection (CSV Injection / DDE Attacks).
 * If a cell value begins with '=', '+', '-', or '@', it prepends a single quote (').
 */
export const sanitizeCsvCell = (value: any): string => {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Strip or quote formula triggers
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape inner double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
};

/**
 * Converts array of objects to CSV format with safe cell escaping
 */
export const buildCsvString = (
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string => {
  const headerLine = headers.map(sanitizeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(sanitizeCsvCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
};
