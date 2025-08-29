/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

import { DeleteProjectForm } from '../../components/DeleteProjectForm';
import { ProjectCreationForm } from '../../components/ProjectCreationForm';
import { SearchForm } from '../../components/SearchForm';
import { SheetCreationForm } from '../../components/SheetCreationForm';
import { SheetRenamingForm } from '../../components/SheetRenamingForm';
import { EditMenuItems } from '../../enums/EditMenuItems';
import { FileMenuItems } from '../../enums/FileMenuItems';
import { MenuItems } from '../../enums/MenuItems';
import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_editmenu');

const tableForSearch = 'SearchTable';

const fieldForSearch = 'SearchField';

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

test.beforeAll(async ({ browser }) => {
  const tableDsl = `!layout(2, 12, "title", "headers")\ntable ${tableForSearch}\n[${fieldForSearch}] = 1\n`;
  await TestFixtures.createProject(
    storagePath,
    browser,
    projectName,
    2,
    12,
    tableForSearch,
    tableDsl
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

test.describe('edit menu', () => {
  //Undo
  test('undo last action', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const row = 1,
      column = 2;
    await projectPage.getVisualization().clickOnCell(row, column);
    await page.keyboard.type('f1=5');
    await page.keyboard.press('Enter');
    await projectPage.getVisualization().expectTableToAppear(row, column);
    await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Undo);
    await projectPage.getVisualization().expectTableToDissapear(row, column);
  });
  //Undo hotkey
  test('undo last action by hotkey', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const row = 1,
      column = 4;
    await projectPage.getVisualization().clickOnCell(row, column);
    await page.keyboard.type('f2=10');
    await page.keyboard.press('Enter');
    await projectPage.getVisualization().expectTableToAppear(row, column);
    await page.keyboard.press('Control+Z');
    await projectPage.getVisualization().expectTableToDissapear(row, column);
  });
  //Redo
  test('redo last action', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const row = 1,
      column = 6;
    await projectPage.getVisualization().clickOnCell(row, column);
    await page.keyboard.type('f3=5');
    await page.keyboard.press('Enter');
    await projectPage.getVisualization().expectTableToAppear(row, column);
    await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Undo);
    await projectPage.getVisualization().expectTableToDissapear(row, column);
    await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Redo);
    await projectPage.getVisualization().expectTableToAppear(row, column);
  });
  //Redo hotkey
  test('redo last action by hotkey', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const row = 1,
      column = 8;
    await projectPage.getVisualization().clickOnCell(row, column);
    await page.keyboard.type('f4=5');
    await page.keyboard.press('Enter');
    await projectPage.getVisualization().expectTableToAppear(row, column);
    await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Undo);
    await projectPage.getVisualization().expectTableToDissapear(row, column);
    await page.keyboard.press('Control+Shift+Z');
    await projectPage.getVisualization().expectTableToAppear(row, column);
  });
  //Search
  test('search project', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Search);
    const searchForm = new SearchForm(page);
    await searchForm.switchTab('Projects');
    await searchForm.search(projectName);
    await expect(searchForm.getFirstSearchResult()).toHaveText(projectName);
  });

  test('search sheet', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Search);
    const searchForm = new SearchForm(page);
    await searchForm.switchTab('Sheets');
    await searchForm.search('Sheet1');
    await expect(searchForm.getFirstSearchResult()).toHaveText('Sheet1');
  });

  test('search table', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Search);
    const searchForm = new SearchForm(page);
    await searchForm.switchTab('Tables');
    await searchForm.search(tableForSearch);
    await expect(searchForm.getFirstSearchResult()).toHaveText(tableForSearch);
  });

  test('search field', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Search);
    const searchForm = new SearchForm(page);
    await searchForm.switchTab('Fields');
    await searchForm.search(fieldForSearch);
    await expect(searchForm.getFirstSearchResult()).toHaveText(fieldForSearch);
  });
  //Search hotkey
  test('open search by hotkey', async () => {
    await ProjectPage.createInstance(page);
    await page.keyboard.press('Control+Shift+F');
    const searchForm = new SearchForm(page);
    await expect(searchForm.getFirstSearchResult()).toBeVisible();
  });

  test('search non existing data', async () => {
    await ProjectPage.createInstance(page);
    await page.keyboard.press('Control+Shift+F');
    const searchForm = new SearchForm(page);
    searchForm.search('jgdfk;jsdlkvncdfjvnfvlkdjfjasdfbmgflkf');
    await expect(searchForm.getNoResultsLabel()).toBeVisible();
  });

  // Rename sheet
  test('rename sheet', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.showProjectPanel();
    await projectPage.performMenuCommand(
      MenuItems.Edit,
      EditMenuItems.RenameWorksheet
    );
    const sheetRenameForm = new SheetRenamingForm(page);
    await sheetRenameForm.fillForm('renamedSheet');
    await projectPage.projectShouldBeInProjectsTree('renamedSheet');
  });
  //Delete sheet
  test('delete sheet', async () => {
    /*const projectPage = await ProjectPage.createInstance(page);
    await projectPage.performMenuCommand(
      MenuItems.File,
      FileMenuItems.CreateWorkSheet
    );
    const createWorkSheet = new SheetCreationForm(page);
    const newSheetName = 'SheetForDelete';
    await createWorkSheet.fillForm(newSheetName);
    await projectPage.projectShouldBeInProjectsTree(newSheetName);
    await projectPage.clickOnItemInProjectsTree(newSheetName);
    await projectPage.performMenuCommand(
      MenuItems.Edit,
      EditMenuItems.DeleteWorksheet
    );
    const deleteSheetForm = new DeleteProjectForm(page);
    await deleteSheetForm.confirmDelete();
    await projectPage.projectShouldNotBeInProjectsTree(newSheetName);*/
  });
});
