/* eslint-disable playwright/expect-expect */
import { expect, test } from '@playwright/test';

import { DeleteProjectForm } from '../../components/DeleteProjectForm';
import { OpenProjectForm } from '../../components/OpenProjectForm';
import { ProjectCreationForm } from '../../components/ProjectCreationForm';
import { ProjectTree } from '../../components/ProjectTree';
import { SheetCreationForm } from '../../components/SheetCreationForm';
import { FileMenuItems } from '../../enums/FileMenuItems';
import { MenuItems } from '../../enums/MenuItems';
import { ProjectPage } from '../../pages/ProjectPage';
import { ProjectSelection } from '../../pages/ProjectSelection';
import { TestFixtures } from '../TestFixtures';

const projectName = 'autotest_filemenu';

const additionalProj = 'autotest_switch';

//const deleteProj = 'autotest_for_delete';

test.beforeAll(async ({ browser }) => {
  await TestFixtures.createEmptyProject(browser, projectName);
  await TestFixtures.createEmptyProject(browser, additionalProj);
  //  await TestFixtures.createEmptyProject(browser, deleteProj);
});

test.beforeEach(async ({ page }) => {
  await TestFixtures.openProject(page, projectName);
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
  await TestFixtures.deleteProject(browser, additionalProj);
});

//create project
test('create new project', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.performMenuCommand(
    MenuItems.File,
    FileMenuItems.CreateProject
  );
  const projectCreationForm = new ProjectCreationForm(page);
  const projName = 'newTestProject';
  await projectCreationForm.fillForm(projName);
  await projectPage.titleShouldContainProjectName(projName);
  await TestFixtures.deleteProjectFromPage(projectPage);
});
//create project hotkey
test('create new project by hotkey', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  page.keyboard.press('Alt+P');
  const projectCreationForm = new ProjectCreationForm(page);
  const projName = 'newTestProjectHotKey';
  await projectCreationForm.fillForm(projName);
  await projectPage.titleShouldContainProjectName(projName);
  await TestFixtures.deleteProjectFromPage(projectPage);
});
//open project
test('open project', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.performMenuCommand(
    MenuItems.File,
    FileMenuItems.OpenProject
  );
  const openProjectForm = new OpenProjectForm(page);
  await openProjectForm.selectProject(additionalProj);
  await projectPage.titleShouldContainProjectName(additionalProj);
});
//create sheet
test('create new worksheet', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.performMenuCommand(
    MenuItems.File,
    FileMenuItems.CreateWorkSheet
  );
  const createWorkSheetForm = new SheetCreationForm(page);
  const newSheetName = 'newSheet12';
  createWorkSheetForm.fillForm(newSheetName);
  const projectTree = new ProjectTree(page);
  await expect(projectTree.getTreeNode(newSheetName)).toBeVisible();
});
//delete project
/*test('delete project', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.performMenuCommand(
    MenuItems.File,
    FileMenuItems.OpenProject
  );
  const openProjectForm = new OpenProjectForm(page);
  await openProjectForm.selectProject(deleteProj);
  await projectPage.titleShouldContainProjectName(deleteProj);
  await projectPage.performMenuCommand(
    MenuItems.File,
    FileMenuItems.DeleteProject
  );
  const deleteProjectForm = new DeleteProjectForm(page);
  await deleteProjectForm.confirmDelete();
  const startPage = new ProjectSelection(page);
  await expect(startPage.getWelcomeElement()).toBeVisible();
  await expect(startPage.getProjectInList(deleteProj)).toBeHidden();
});*/
//close project
test('close project', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.performMenuCommand(
    MenuItems.File,
    FileMenuItems.CloseProject
  );
  const startPage = new ProjectSelection(page);
  await expect(startPage.getWelcomeElement()).toBeVisible();
  await expect(startPage.getProjectInList(projectName)).toBeVisible();
});
