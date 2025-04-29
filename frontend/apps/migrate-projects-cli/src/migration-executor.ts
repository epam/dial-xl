import { create } from 'archiver';
import * as fs from 'fs';
import inquirer from 'inquirer';
import * as path from 'path';
import { Readable } from 'stream';

import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const DIR = path.dirname(path.dirname(path.dirname(__dirname)));
const OUTPUT_ZIP_FILE = path.join(DIR, 'migrated_files.zip');
const TEMP_DIR = path.join(DIR, 'migration_temp');
const TEST_MIGRATION_DIR = path.join(TEMP_DIR, 'test_migration');
const ALLOWED_FILE_KEY_PREFIXES = ['Users/', 'public/'];

interface S3Instance {
  bucketName: string;
  s3Client: S3Client;
}

type ExecutableFuncAdditionalParams = {
  isTestMigration: boolean;
} & any;

export type ExecutableFunc = (
  qgFileContent: string,
  additionalParams: ExecutableFuncAdditionalParams
) => Promise<string>;

// Utility to convert stream to string
const streamToString = async (stream: Readable): Promise<string> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString('utf-8');
};

// Retrieve file content as string
async function getFileContentAsString(
  { bucketName, s3Client }: S3Instance,
  key: string
): Promise<string> {
  const params = { Bucket: bucketName, Key: key };
  const data = await s3Client.send(new GetObjectCommand(params));
  if (!data.Body) throw new Error(`No content found for ${key}`);

  return await streamToString(data.Body as Readable);
}

// Update file content back to S3
async function updateFileContent(
  { bucketName, s3Client }: S3Instance,
  key: string,
  newContent: string
): Promise<void> {
  const params = { Bucket: bucketName, Key: key, Body: newContent };
  await s3Client.send(new PutObjectCommand(params));
}

function saveFileContent(
  fileContent: string,
  { bucketName }: S3Instance,
  key: string,
  dirName: string
): string {
  const localPath = path.join(dirName, bucketName, key);
  const dir = path.dirname(localPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(localPath, fileContent);

  return localPath;
}

// Download file while preserving structure
async function downloadFile(
  s3Instance: S3Instance,
  key: string,
  dirName: string = TEMP_DIR
): Promise<string> {
  const fileContent = await getFileContentAsString(s3Instance, key);

  return saveFileContent(fileContent, s3Instance, key, dirName);
}

// Archive downloaded files into a ZIP using jszip
function archiveFiles(): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(OUTPUT_ZIP_FILE);
    const archive = create('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(TEMP_DIR, false);
    archive.finalize();
  });
}

async function collectFiles(s3Instance: S3Instance): Promise<string[]> {
  console.log('Collecting qg files keys in bucket...');

  let continuationToken: string | undefined = undefined;
  const files: string[] = [];

  do {
    const params: { Bucket: string; ContinuationToken: string | undefined } = {
      Bucket: s3Instance.bucketName,
      ContinuationToken: continuationToken,
    };
    const objectsResponse = await s3Instance.s3Client.send(
      new ListObjectsV2Command(params)
    );
    const contents = (objectsResponse.Contents || []).filter((item) =>
      ALLOWED_FILE_KEY_PREFIXES.some((prefix) => item.Key?.startsWith(prefix))
    );

    for (const item of contents) {
      if (item.Key && item.Key.endsWith('.qg')) {
        files.push(item.Key);
      }
    }

    continuationToken = objectsResponse.IsTruncated
      ? objectsResponse.NextContinuationToken
      : undefined;
  } while (continuationToken);

  console.log('End collecting qg files keys in bucket...');

  return files;
}

// Process files for backup
async function processForBackup(
  s3Instance: S3Instance,
  files: string[]
): Promise<void> {
  console.log('[Backup] Downloading files...');

  let percentage = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const localPercentage = Math.round((i / files.length) * 100);

    if (localPercentage !== percentage) {
      percentage = localPercentage;
      console.log(`[Backup] ${percentage}% finished (${i}/${files.length})`);
    }
    await downloadFile(s3Instance, file);
  }
}

// Process files for migration
async function processForTestMigration(
  s3Instance: S3Instance,
  files: string[],
  functionToExecute: ExecutableFunc,
  functionAdditionalArgs: ExecutableFuncAdditionalParams
): Promise<void> {
  console.log('[migration-TEST] Started migrating files in bucket...');

  let percentage = 0;
  let filesMigrated = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const fileContent = await getFileContentAsString(s3Instance, file);

      const newContent = await functionToExecute(fileContent, {
        fileKey: file,
        ...functionAdditionalArgs,
      });

      if (newContent !== fileContent) {
        saveFileContent(newContent, s3Instance, file, TEST_MIGRATION_DIR);

        filesMigrated++;
      }

      const localPercentage = Math.round((i / files.length) * 100);

      if (localPercentage !== percentage) {
        percentage = localPercentage;
        console.log(
          `[migration-TEST] ${percentage}% finished (${i}/${files.length})`
        );
      }
    } catch (e) {
      console.log(e);
      console.error(
        `[migration-TEST] File failed for test migration ${file}- ${e}`
      );
    }
  }

  console.log(
    `[migration-TEST] Migration performed for ${filesMigrated} files`
  );
}

// Process files for migration
async function processForMigration(
  s3Instance: S3Instance,
  files: string[],
  functionToExecute: ExecutableFunc,
  functionAdditionalArgs: ExecutableFuncAdditionalParams
): Promise<void> {
  console.log('[migration] Started migrating files in bucket...');

  let percentage = 0;
  let filesMigrated = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const fileContent = await getFileContentAsString(s3Instance, file);
      const newContent = await functionToExecute(fileContent, {
        fileKey: file,
        ...functionAdditionalArgs,
      });

      if (newContent !== fileContent) {
        await updateFileContent(s3Instance, file, newContent);

        filesMigrated++;
      }

      const localPercentage = Math.round((i / files.length) * 100);

      if (localPercentage !== percentage) {
        percentage = localPercentage;
        console.log(
          `[migration] ${percentage}% finished (${i}/${files.length})`
        );
      }
    } catch (e) {
      console.error(`[migration] File failed for migration ${file}- ${e}`);
    }
  }

  console.log(`[migration] Migration performed for ${filesMigrated} files`);
}

// Main execution
export async function executeMigration({
  ENABLE_BACKUP = true,
  ENABLE_TEST_MIGRATION = false,
  ENABLE_MIGRATION = false,
  region,
  accessKeyId,
  secretAccessKey,
  s3StorageBucket,
  qgAccessToken,
  migration,
}: {
  ENABLE_BACKUP?: boolean;
  ENABLE_TEST_MIGRATION?: boolean;
  ENABLE_MIGRATION?: boolean;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  s3StorageBucket: string;
  qgAccessToken: string | undefined;
  migration: ExecutableFunc;
}) {
  console.log('------------- Migration process START ------------\n\n');

  if (!ENABLE_BACKUP && !ENABLE_TEST_MIGRATION && !ENABLE_MIGRATION) return;

  const s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  const s3Instance = { bucketName: s3StorageBucket, s3Client };

  const files = await collectFiles(s3Instance);

  // Create archive with all backup files
  if (ENABLE_BACKUP) {
    const isContinuePrompt = await inquirer.prompt([
      {
        name: 'continueProcess',
        type: 'confirm',
        message: 'Do you want to continue - next step is backup',
        default: true,
      },
    ]);
    if (!isContinuePrompt.continueProcess) {
      process.exit(1);
    }

    console.log('[Backup] Start');
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEMP_DIR);

    console.log('[Backup] Downloading files.');
    await processForBackup(s3Instance, files);

    console.log('[Backup] Creating archive with downloaded files.');
    await archiveFiles();

    console.log(
      `[Backup] Backup completed, archived and available by this path: ${OUTPUT_ZIP_FILE}.`
    );
  }

  // Just do the processing and output files in temp folder
  if (ENABLE_TEST_MIGRATION) {
    const isContinuePrompt = await inquirer.prompt([
      {
        name: 'continueProcess',
        type: 'confirm',
        message: 'Do you want to continue - next step is test migration',
        default: true,
      },
    ]);
    if (!isContinuePrompt.continueProcess) {
      process.exit(1);
    }

    console.log('[migration-TEST] Migration started.');

    await processForTestMigration(s3Instance, files, migration, {
      qgAccessToken,
      isTestMigration: true,
    });

    console.log(
      `[migration-TEST] Migration completed. Files can be found by this path: ${TEST_MIGRATION_DIR}`
    );
  }

  // Do real migration
  if (ENABLE_MIGRATION) {
    const isContinuePrompt = await inquirer.prompt([
      {
        name: 'continueProcess',
        type: 'confirm',
        message: 'Do you want to continue - next step is real migration',
        default: true,
      },
    ]);
    if (!isContinuePrompt.continueProcess) {
      process.exit(1);
    }

    console.log('[migration] Migration started.');
    await processForMigration(s3Instance, files, migration, { qgAccessToken });

    console.log('[migration] Migration completed.');
  }

  console.log('------------- Migration process END ------------\n\n');
}
