import { Command } from 'commander';
import inquirer from 'inquirer';

import { executeMigration } from './migration-executor';
import {
  fromDollarSignToFunctionName,
  fromInputReferenceToMultiFieldGroup,
  fromPlacementToLayoutDecorator,
} from './migrations';

export const program = new Command();

const migrations = {
  'from-placement-to-layout': fromPlacementToLayoutDecorator,
  'from-dollar-sign-to-function-name': fromDollarSignToFunctionName,
  'from-input-reference-to-multi-field-group':
    fromInputReferenceToMultiFieldGroup,
};

program
  .name('qg-migrate')
  .description('CLI to migrate qg project using function provided by user')
  .requiredOption('-r, --region <region>', 'Region where s3 migration run')
  .requiredOption('-b, --bucket <s3StorageBucket>', 'S3 storage bucket')
  .requiredOption('-k, --key <accessKeyId>', 'Access key Id')
  .requiredOption('-s, --secret <secretAccessKey>', 'Secret access key')
  .option(
    '-t, --tokenQGAccess <tokenQGAccess>',
    'Access token from authorization in app'
  )
  .action(async (options) => {
    const answers = await inquirer.prompt([
      {
        name: 'migration',
        type: 'select',
        message: 'Select migration from list',
        choices: Object.keys(migrations),
      },
      {
        name: 'runBackup',
        type: 'confirm',
        message:
          'Create a backup archive with all qg projects before migration',
        default: true,
      },
      {
        name: 'runTestMigration',
        type: 'confirm',
        message:
          'Do a test migration on user - migrated data will be saved only locally',
        default: true,
      },
      {
        name: 'runRealMigration',
        type: 'confirm',
        message: 'Do a migration on real users files',
        default: false,
      },
    ]);

    const migration = migrations[answers.migration];
    const backup = answers.runBackup;
    const testMigration = answers.runTestMigration;
    let realMigration: boolean;
    if (answers.runRealMigration) {
      const additionalConfirm = await inquirer.prompt([
        {
          name: 'runRealMigration',
          type: 'confirm',
          message:
            'Are you sure you want to run the migration on real user files? This action is not cancellable',
          default: false,
        },
      ]);

      realMigration = additionalConfirm.runRealMigration;
    }

    if (!migration) {
      console.error(
        'Function for migration from provided file cannot be found'
      );
      process.exit(1);
    }

    const finalArguments = {
      ENABLE_BACKUP: backup,
      ENABLE_TEST_MIGRATION: testMigration,
      ENABLE_MIGRATION: realMigration,
      region: options.region,
      accessKeyId: options.key,
      secretAccessKey: options.secret,
      s3StorageBucket: options.bucket,
      qgAccessToken: options.tokenQGAccess,
      migration,
    };

    console.info(finalArguments);

    executeMigration(finalArguments);
  });
