export enum ClipboardType {
  PLAIN = 'text/plain',
  HTML = 'text/html',
}

const toBase64Utf8 = (value: unknown): string => {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);

  return btoa(binary);
};

const escapeHtml = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export const rowsToHtml = (rows: string[][], objectData?: any) => {
  const meta = objectData
    ? ` data-object-data="${toBase64Utf8(objectData)}"`
    : '';

  return `<table${meta}><tbody>${rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`,
    )
    .join('')}</tbody></table>`;
};

type PendingCopy = { plain: string; html?: string } | null;
let pendingCopy: PendingCopy = null;
let handlersInstalled = false;

const ensureClipboardHandlers = () => {
  if (handlersInstalled) return;
  handlersInstalled = true;

  document.addEventListener('copy', (e) => {
    if (!pendingCopy) return;

    e.preventDefault();

    const dt = e.clipboardData;
    if (!dt) return;

    dt.setData(ClipboardType.PLAIN, pendingCopy.plain);
    if (pendingCopy.html) dt.setData(ClipboardType.HTML, pendingCopy.html);

    pendingCopy = null;
  });
};

export const makeCopy = async (plain: string, html?: string): Promise<void> => {
  ensureClipboardHandlers();

  pendingCopy = { plain, html };
  const ok =
    typeof document.execCommand === 'function' && document.execCommand('copy');
  if (ok) return;

  pendingCopy = null;

  if (navigator.clipboard) {
    if (html && navigator.clipboard.write) {
      const clipboardItemData: Record<string, Blob> = {
        [ClipboardType.PLAIN]: new Blob([plain], { type: ClipboardType.PLAIN }),
        [ClipboardType.HTML]: new Blob([html], { type: ClipboardType.HTML }),
      };
      await navigator.clipboard.write([new ClipboardItem(clipboardItemData)]);

      return;
    }

    if (navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(plain);

      return;
    }
  }

  await execCopyCommand(plain);
};

const execCopyCommand = (textToCopy: string): Promise<void> => {
  const textArea = document.createElement('textarea');
  textArea.value = textToCopy;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus({ preventScroll: true });
  textArea.select();

  return new Promise((res, rej) => {
    const ok =
      typeof document.execCommand === 'function' &&
      document.execCommand('copy');
    textArea.remove();
    ok ? res() : rej(new Error('execCommand(copy) failed'));
  });
};

// Based on ag-grid stringToArray method
export function stringToArray(strData: string, delimiter: string): string[][] {
  const data: string[][] = [[]];
  let insideQuotedField = false;

  if (strData === '') {
    return data;
  }

  const isNewline = (char: string) => {
    return char === '\r' || char === '\n';
  };

  const ensureDataExists = (row: number, column: number) => {
    if (!data[row]) {
      data[row] = [];
    }
    if (!data[row][column]) {
      data[row][column] = '';
    }
  };

  let row = 0;
  let column = 0;

  for (let position = 0; position < strData.length; position++) {
    const previousChar = strData[position - 1];
    const currentChar = strData[position];
    const nextChar = strData[position + 1];

    ensureDataExists(row, column);

    if (currentChar === '"') {
      if (insideQuotedField) {
        if (nextChar === '"') {
          data[row][column] += '"';
          position++;
        } else {
          insideQuotedField = false;
        }
        continue;
      } else if (
        previousChar === undefined ||
        previousChar === delimiter ||
        isNewline(previousChar)
      ) {
        insideQuotedField = true;
        continue;
      }
    }

    if (!insideQuotedField) {
      if (currentChar === delimiter) {
        column++;
        ensureDataExists(row, column);
        continue;
      } else if (isNewline(currentChar)) {
        column = 0;
        row++;
        ensureDataExists(row, column);
        if (currentChar === '\r' && nextChar === '\n') {
          position++;
        }
        continue;
      }
    }

    data[row][column] += currentChar;
  }

  return data;
}
