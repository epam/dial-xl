/* eslint-disable playwright/expect-expect */
import { expect, test } from '@playwright/test';

import { ProjectCreationForm } from '../../components/ProjectCreationForm';
import { SearchForm } from '../../components/SearchForm';
import { SheetCreationForm } from '../../components/SheetCreationForm';
import { SheetRenamingForm } from '../../components/SheetRenamingForm';
import { EditMenuItems } from '../../enums/EditMenuItems';
import { FileMenuItems } from '../../enums/FileMenuItems';
import { MenuItems } from '../../enums/MenuItems';
import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = 'autotest_editmenu';

const tableForSearch = 'SearchTable';

const fieldForSearch = 'SearchField';

test.beforeAll(async ({ browser }) => {
  const tableDsl = `!placement(2, 12)\ntable ${tableForSearch}\n[${fieldForSearch}] = 1\n`;
  await TestFixtures.createProject(
    browser,
    projectName,
    2,
    12,
    tableForSearch,
    tableDsl
  );
});

test.beforeEach(async ({ page }) => {
  await TestFixtures.openProject(page, projectName);
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
});
//Undo
test('undo last action', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const row = 1,
    column = 2;
  await projectPage.getGrid().clickOnCell(row, column);
  await page.keyboard.type('f1=5');
  await page.keyboard.press('Enter');
  await projectPage.getGrid().expectTableToAppear(row, column);
  await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Undo);
  await projectPage.getGrid().expectTableToDissapear(row, column);
});
//Undo hotkey
test('undo last action by hotkey', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const row = 1,
    column = 4;
  await projectPage.getGrid().clickOnCell(row, column);
  await page.keyboard.type('f2=10');
  await page.keyboard.press('Enter');
  await projectPage.getGrid().expectTableToAppear(row, column);
  await page.keyboard.press('Control+Z');
  await projectPage.getGrid().expectTableToDissapear(row, column);
});
//Redo
test('redo last action', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const row = 1,
    column = 6;
  await projectPage.getGrid().clickOnCell(row, column);
  await page.keyboard.type('f3=5');
  await page.keyboard.press('Enter');
  await projectPage.getGrid().expectTableToAppear(row, column);
  await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Undo);
  await projectPage.getGrid().expectTableToDissapear(row, column);
  await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Redo);
  await projectPage.getGrid().expectTableToAppear(row, column);
});
//Redo hotkey
test('redo last action by hotkey', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const row = 1,
    column = 8;
  await projectPage.getGrid().clickOnCell(row, column);
  await page.keyboard.type('f4=5');
  await page.keyboard.press('Enter');
  await projectPage.getGrid().expectTableToAppear(row, column);
  await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Undo);
  await projectPage.getGrid().expectTableToDissapear(row, column);
  await page.keyboard.press('Control+Shift+Z');
  await projectPage.getGrid().expectTableToAppear(row, column);
});
//Search
test('search project', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Search);
  const searchForm = new SearchForm(page);
  await searchForm.switchTab('Projects');
  await searchForm.search(projectName);
  await expect(searchForm.getFirstSearchResult()).toHaveText(projectName);
});

test('search sheet', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Search);
  const searchForm = new SearchForm(page);
  await searchForm.switchTab('Sheets');
  await searchForm.search('Sheet1');
  await expect(searchForm.getFirstSearchResult()).toHaveText('Sheet1');
});

test('search table', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Search);
  const searchForm = new SearchForm(page);
  await searchForm.switchTab('Tables');
  await searchForm.search(tableForSearch);
  await expect(searchForm.getFirstSearchResult()).toHaveText(tableForSearch);
});

test('search field', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.Search);
  const searchForm = new SearchForm(page);
  await searchForm.switchTab('Fields');
  await searchForm.search(fieldForSearch);
  await expect(searchForm.getFirstSearchResult()).toHaveText(fieldForSearch);
});
//Search hotkey
test('open search by hotkey', async ({ page }) => {
  await ProjectPage.createInstance(page);
  await page.keyboard.press('Control+Shift+F');
  const searchForm = new SearchForm(page);
  await expect(searchForm.getFirstSearchResult()).toBeVisible();
});

test('search non existing data', async ({ page }) => {
  await ProjectPage.createInstance(page);
  await page.keyboard.press('Control+Shift+F');
  const searchForm = new SearchForm(page);
  searchForm.search('jgdfk;jsdlkvncdfjvnfvlkdjfjasdfbmgflkf');
  await expect(searchForm.getFirstSearchResult()).toBeHidden();
  await expect(searchForm.getNoResultsLabel()).toBeVisible();
});
//Rename project
/*test('rename project', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.performMenuCommand(MenuItems.Edit, EditMenuItems.RenameProject);  
  const projectRenameForm = new ProjectCreationForm(page);
  const newProjName = 'autotest_editmenu_renamed'
  await projectRenameForm.fillForm(newProjName);
  await projectPage.projectShouldBeInProjectsTree(newProjName);
  projectName = newProjName;
});*/

// Rename sheet
test('rename sheet', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.performMenuCommand(
    MenuItems.Edit,
    EditMenuItems.RenameWorksheet
  );
  const sheetRenameForm = new SheetRenamingForm(page);
  await sheetRenameForm.fillForm('renamedSheet');
  await projectPage.projectShouldBeInProjectsTree('renamedSheet');
});
//Delete sheet
test('delete sheet', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
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
  await projectPage.projectShouldNotBeInProjectsTree(newSheetName);
});
