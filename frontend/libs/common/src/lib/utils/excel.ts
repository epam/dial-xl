export const excelMaxCols = 16384;
export const excelMaxRows = 1048576;

export const toExcelColName = (col: number) => {
  let n = Math.max(1, Math.floor(col));
  let s = '';
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }

  return s;
};

export const excelColToIndex = (letters: string): number | null => {
  if (!letters || !/^[A-Z]+$/.test(letters)) return null;
  let n = 0;
  for (let i = 0; i < letters.length; i++) {
    n = n * 26 + (letters.charCodeAt(i) - 64);
  }

  return n;
};

export const parseExcelRange = (
  input: string,
): {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
} | null => {
  const s = input.trim().toUpperCase().replaceAll('$', '');
  if (!s) return null;

  // A1 or A1:D100
  const m = s.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
  if (!m) return null;

  const c1 = excelColToIndex(m[1]);
  const r1 = Number(m[2]);

  const c2 = m[3] ? excelColToIndex(m[3]) : c1;
  const r2 = m[4] ? Number(m[4]) : r1;

  if (c1 === null || c2 === null) return null;
  if ([r1, r2].some((v) => Number.isNaN(v))) return null;

  const startCol = Math.min(c1, c2);
  const endCol = Math.max(c1, c2);
  const startRow = Math.min(r1, r2);
  const endRow = Math.max(r1, r2);

  if (startCol < 0 || startRow < 0) return null;
  if (endCol >= excelMaxCols || endRow >= excelMaxRows) return null;

  return { startCol, endCol, startRow, endRow };
};
