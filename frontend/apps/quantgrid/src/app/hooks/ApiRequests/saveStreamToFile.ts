import Bowser from 'bowser';

export async function saveStreamToFile_CHROME_ONLY(opts: {
  res: Response;
  suggestedName: string;
  mimeType?: string;
}): Promise<'saved' | 'cancelled'> {
  const { res, suggestedName, mimeType = 'application/zip' } = opts;

  if (!res.body) throw new Error('ReadableStream is not available');

  let handle: any;
  try {
    handle = await (window as any).showSaveFilePicker({
      suggestedName,
      types: [{ description: 'ZIP', accept: { [mimeType]: ['.zip'] } }],
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') return 'cancelled';
    throw e;
  }

  const writable = await handle.createWritable();
  const reader = res.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await writable.write(value);
    }

    return 'saved';
  } finally {
    try {
      await writable.close();
    } finally {
      reader.releaseLock();
    }
  }
}

export const isChromiumWithFSAccess = () => {
  const hasAPI =
    typeof window !== 'undefined' &&
    typeof (window as any).showSaveFilePicker === 'function' &&
    typeof ReadableStream !== 'undefined' &&
    (window as any).isSecureContext === true;

  if (!hasAPI) return false;

  try {
    const parsed = Bowser.parse(window.navigator.userAgent);
    const name = (parsed.browser?.name || '').toLowerCase();
    const major = Number(parsed.browser?.version?.split('.')[0] ?? 0);

    const chromium =
      name.includes('chrome') ||
      name.includes('chromium') ||
      name.includes('microsoft edge') ||
      name.includes('edge') ||
      name.includes('opera');

    if (!chromium) return false;
    if (Number.isFinite(major) && major > 0 && major < 86) return false;

    return true;
  } catch {
    return true;
  }
};
