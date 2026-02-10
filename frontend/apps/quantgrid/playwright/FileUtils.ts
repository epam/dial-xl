import { constants, promises as fsPromises } from 'fs';
import * as path from 'path';

export async function checkFileExistsWithTimeout(
  filePath: string,
  timeoutMs: number
): Promise<boolean> {
  const dirname = path.dirname(filePath);
  const searchStr = path.basename(filePath);
  const startTime = Date.now();

  while (true) {
    try {
      const files = await fsPromises.readdir(dirname);
      for (const file of files) {
        if (file.includes(searchStr)) {
          return true;
        }
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // If directory doesn't exist, treat as no file found
    }

    if (Date.now() - startTime >= timeoutMs) {
      return false;
    }

    // Poll every 100ms
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
