/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_projects');

const tableRow = 2;

const tableColumn = 2;

const tableName = 'Table1';

const table2Row = 2;

const table2Column = 10;

const table2Name = 'Table2';

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

test.beforeAll(async ({ browser }) => {
  const table1Dsl = `!layout(${tableRow}, ${tableColumn}, "title", "headers")\ntable ${tableName}\n[Field1] = 5\n[Field2] = 7\n[Field3] = 4\n[Field4] = 10`;
  const table2Dsl = `!layout(${table2Row}, ${table2Column}, "title", "headers")\ntable ${table2Name}\n[Field1] = 5\n key [Field2] = 7\n[Field3] = 4\ndim [Field4] = 10`;
  await TestFixtures.createProject(
    storagePath,
    browser,
    projectName,
    tableRow,
    tableColumn,
    tableName,
    table1Dsl,
    table2Dsl
  );
  browserContext = await browser.newContext({ storageState: storagePath });
});

test.beforeEach(async () => {
  page = await browserContext.newPage();
  await TestFixtures.openProject(page, projectName);
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async ({ browser }) => {
  await browserContext.close();
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('project panel', () => {
  test.describe('project level', () => {
    test('rename project', async () => {});

    test('delete project', async () => {});

    test('create worksheet', async () => {});
  });

  test.describe('sheet level', () => {
    test('select worksheet', async () => {});

    test('rename worksheet', async () => {});

    test('delete worksheet', async () => {});
  });

  test.describe('table level', () => {
    test('select table', async () => {});

    test('move table', async () => {});

    test('hide table header', async () => {});

    test('hide fields header', async () => {});

    test('show table header', async () => {});

    test('show fields header', async () => {});

    test('create derived table', async () => {});

    test('clone table', async () => {});

    test('new field', async () => {});

    test('new row', async () => {});

    test('rename table', async () => {});

    test('delete table', async () => {});

    test('make vertical', async () => {});

    test('make horizontal', async () => {});

    test('open in editor', async () => {});
  });
  test.describe('field level', async () => {
    test('select field', async () => {});

    test('swap left', async () => {});

    test('swap right', async () => {});

    test('increase field width', async () => {});

    test('decrease field width', async () => {});

    test('insert field to left', async () => {});

    test('insert field to right', async () => {});

    test('new row', async () => {});

    test('rename field', async () => {});

    test('edit formula', async () => {});

    test('delete field', async () => {});

    test('add key', async () => {});

    test('make vertical', async () => {});

    test('make horizontal', async () => {});

    test('open in editor', async () => {});

    test('hide table header', async () => {});

    test('hide fields header', async () => {});

    test('show table header', async () => {});

    test('show fields header', async () => {});
  });
});
