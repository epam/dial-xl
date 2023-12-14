import { Browser, expect, Page } from '@playwright/test';

import { DeleteProjectForm } from '../components/DeleteProjectForm';
import { FileMenuItems } from '../enums/FileMenuItems';
import { MenuItems } from '../enums/MenuItems';
import { ProjectPage } from '../pages/ProjectPage';
import { ProjectSelection } from '../pages/ProjectSelection';

export class TestFixtures {
  public static async createProject(
    browser: Browser,
    projectName: string,
    rowToCheck: number,
    columnToCheck: number,
    nameToCheck: string,
    ...dsls: string[]
  ) {
    const initPage = await browser.newPage();

    // Go to the starting url before each test.
    await initPage.goto('/');
    const startPage = new ProjectSelection(initPage);

    if (!(await startPage.addNewProject(projectName))) {
      await startPage.openProject(projectName);
    }
    const projectPage = await ProjectPage.createInstance(initPage);
    for (const dsl of dsls) {
      await projectPage.addDSL(dsl);
    }
    await expect(projectPage.getCellText(rowToCheck, columnToCheck)).toHaveText(
      nameToCheck
    );
    await initPage.close();
  }

  public static async expectTableToBeDisplayed(
    page: Page,
    row: number,
    column: number
  ) {
    const projectPage = await ProjectPage.createInstance(page);
    await expect(projectPage.getCellText(row, column)).not.toBeEmpty();
    await expect(projectPage.getCellText(row + 1, column)).not.toBeEmpty();
  }

  public static async createEmptyProject(
    browser: Browser,
    projectName: string
  ) {
    const initPage = await browser.newPage();
    await initPage.goto('/');
    const startPage = new ProjectSelection(initPage);

    await startPage.addNewProject(projectName);
    await initPage.close();
  }

  public static async openProject(page: Page, projectName: string) {
    await page.goto('/');
    const startPage = new ProjectSelection(page);
    await startPage.openProject(projectName);
  }

  public static async deleteProject(browser: Browser, projectName: string) {
    const cleaningPage = await browser.newPage();
    await cleaningPage.goto('/');
    await cleaningPage.getByText(projectName).first().click();
    const projectPage = await ProjectPage.createInstance(cleaningPage);
    await this.deleteProjectFromPage(projectPage);
    await cleaningPage.close();
  }

  public static async deleteProjectFromPage(projectPage: ProjectPage) {
    await projectPage.performMenuCommand(
      MenuItems.File,
      FileMenuItems.DeleteProject
    );
    const deleteProjectForm = new DeleteProjectForm(
      projectPage.getPlaywrightPage()
    );
    await deleteProjectForm.confirmDelete();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}
