/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

import { ImportForm } from '../../components/ImportForm';
import { ProjectTree } from '../../components/ProjectPanel';
import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_inputs');

const tableRow = 2;

const tableColumn = 2;

const tableName = 'Table1';

const table2Row = 2;

const table2Column = 10;

const table2Name = 'Table2';

let browserContext: BrowserContext;

let page: Page;

const storagePath = TestFixtures.getStoragePath();

test.beforeAll(async ({ browser }) => {
  const table1Dsl = `!layout(${tableRow}, ${tableColumn}, "title", "headers")\ntable ${tableName}\n[Field1] = 5\n[Field2] = 7\n[Field3] = 4\n[Field4] = 10`;
  const table2Dsl = `!layout(${table2Row}, ${table2Column}, "title", "headers")\ntable ${table2Name}\n[Field1] = 5\n key [Field2] = 7\n[Field3] = 4\ndim [Field4] = 10`;
  browserContext = await browser.newContext({ storageState: storagePath });
  await TestFixtures.createProject(
    storagePath,
    browserContext,
    projectName,
    tableRow,
    tableColumn,
    tableName,
    table1Dsl,
    table2Dsl,
  );
});

test.beforeEach(async () => {
  page = await browserContext.newPage();
  await TestFixtures.openProject(page, projectName);
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browserContext, projectName);
  await browserContext.close();
});

test.describe('inputs panel', () => {
  test('create table by drag and drop', async () => {});

  test('create table by menu', async () => {});

  test('add DIAL data source ', async () => {});

  test('check Snowflake data source configuration', async () => {
    const snowflakeFields = [
      'sourceName',
      'root_user',
      'root_password',
      'root_account',
      'root_database',
      'root_schema',
    ];
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.showProjectPanel();
    const projectPanel = new ProjectTree(page);
    await projectPanel.openImportExternalDataSourceForm();
    const importForm = new ImportForm(page);
    await importForm.chooseDataSource('Snowflake');
    await importForm.clickNext();
    await importForm.verifyFields(snowflakeFields);
  });

  test('check Amazon S3 data source configuration', async () => {
    const s3Fields = [
      'sourceName',
      'root_bucket',
      'root_region',
      'root_accessKeyId',
      'root_secretAccessKey',
    ];
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.showProjectPanel();
    const projectPanel = new ProjectTree(page);
    await projectPanel.openImportExternalDataSourceForm();
    const importForm = new ImportForm(page);
    await importForm.chooseDataSource('Amazon S3');
    await importForm.clickNext();
    await importForm.verifyFields(s3Fields);
  });

  test('check Postgre Airbyte data source configuration', async () => {
    const postgreFields = [
      'sourceName',
      'root_host',
      'root_port',
      'root_database',
    ];
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.showProjectPanel();
    const projectPanel = new ProjectTree(page);
    await projectPanel.openImportExternalDataSourceForm();
    const importForm = new ImportForm(page);
    await importForm.chooseDataSource('Postgres');
    await importForm.clickNext();
    await importForm.verifyFields(postgreFields);
  });

  test('check S3 Airbyte data source configuration', async () => {
    const s3airbyteFields = ['sourceName'];
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.showProjectPanel();
    const projectPanel = new ProjectTree(page);
    await projectPanel.openImportExternalDataSourceForm();
    const importForm = new ImportForm(page);
    await importForm.chooseDataSource('S3');
    await importForm.clickNext();
    await importForm.verifyFields(s3airbyteFields);
  });

  test('filter external data sources', async () => {});

  test('import input from system csv file', async () => {});

  test('import input from project file', async () => {});

  test('import a project file with spaces in its name', async () => {});

  test('import a system file with spaces in its name', async () => {});
});
