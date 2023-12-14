export enum ClipboardType {
  PLAIN = 'text/plain',
  HTML = 'text/html',
}

export const rowsToHtml = (rows: string[][], objectData?: any) => {
  return `<table data-object-data="${btoa(JSON.stringify(objectData))}">${rows
    .map((row) => {
      return `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
    })
    .join('')}</table>`;
};

export type DataFromClipboard = { [k: string]: string };

export const readClipboard = async () => {
  if (!navigator.clipboard?.read) {
    return {};
  }

  const clipboardData: DataFromClipboard = {};

  const clipboardItems = await navigator.clipboard.read();

  for (const clipboardItem of clipboardItems) {
    for (const type of clipboardItem.types) {
      clipboardData[type] = await clipboardItem
        .getType(type)
        .then((b: Blob) => b.text());
    }
  }

  return clipboardData;
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
    document.execCommand('copy') ? res() : rej();
    textArea.remove();
  });
};

export const makeCopy = (plain: string, html?: string): Promise<void> => {
  if (typeof navigator.clipboard !== 'undefined') {
    const clipboardItemData: { [k: string]: Blob } = {
      [ClipboardType.PLAIN]: new Blob([plain], { type: ClipboardType.PLAIN }),
    };

    if (html) {
      clipboardItemData[ClipboardType.HTML] = new Blob([html], {
        type: ClipboardType.HTML,
      });
    }

    return navigator.clipboard.write([new ClipboardItem(clipboardItemData)]);
  } else {
    return execCopyCommand(plain);
  }
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
