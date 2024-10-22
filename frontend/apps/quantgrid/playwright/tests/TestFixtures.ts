import * as fs from 'fs';

import { Browser, expect, Page } from '@playwright/test';

import { DeleteProjectForm } from '../components/DeleteProjectForm';
import { FileMenuItems } from '../enums/FileMenuItems';
import { MenuItems } from '../enums/MenuItems';
import { SpreadSheet } from '../logic-entities/SpreadSheet';
import { Table } from '../logic-entities/Table';
import { ProjectPage } from '../pages/ProjectPage';
import { ProjectSelection } from '../pages/ProjectSelection';

export class TestFixtures {
  public static bucketId = '';

  public static getFolderName() {
    return fs.readFileSync('./folderName.txt', 'utf-8').split('\n');
  }

  public static async createProjectNew(
    browser: Browser,
    projectName: string,
    spreadsheet: SpreadSheet
  ) {
    const initPage = await browser.newPage();

    // Go to the starting url before each test.
    await initPage.goto('/');
    const startPage = new ProjectSelection(initPage);

    let workPage = initPage;
    const folderNames = TestFixtures.getFolderName();
    const pagePromise = browser.contexts()[0].waitForEvent('page');
    if (!(await startPage.addNewProject(projectName, folderNames))) {
      await startPage.openProject(projectName, folderNames);
    } else {
      await pagePromise;
      workPage = browser.contexts()[0].pages()[1];
    }
    const projectPage = await ProjectPage.createInstance(workPage);
    await projectPage.addDSL(spreadsheet.toDsl());
    await expect(
      projectPage.getCellText(
        spreadsheet.getTable(0).getTop(),
        spreadsheet.getTable(0).getLeft()
      )
    ).not.toBeEmpty();
    if (this.bucketId === '') {
      const projectUrl = workPage.url();
      this.bucketId = projectUrl.split('projectBucket=')[1].split('&')[0];
    }
    if (workPage !== initPage) {
      await workPage.close();
    }
    await initPage.close();
  }

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
    let workPage = initPage;
    const pagePromise = browser.contexts()[0].waitForEvent('page');
    const folderNames = TestFixtures.getFolderName();
    if (!(await startPage.addNewProject(projectName, folderNames))) {
      await startPage.openProject(projectName, folderNames);
    } else {
      await pagePromise;
      workPage = browser.contexts()[0].pages()[1];
    }
    const projectPage = await ProjectPage.createInstance(workPage);
    for (const dsl of dsls) {
      await projectPage.addDSL(dsl);
    }
    await expect(projectPage.getCellText(rowToCheck, columnToCheck)).toHaveText(
      nameToCheck
    );
    if (this.bucketId === '') {
      const projectUrl = workPage.url();
      this.bucketId = projectUrl.split('projectBucket=')[1].split('&')[0];
    }
    if (workPage !== initPage) {
      await workPage.close();
    }
    await initPage.close();
  }

  public static async expectCellTableToBeDisplayed(
    page: Page,
    row: number,
    column: number
  ) {
    const projectPage = await ProjectPage.createInstance(page);
    await expect(projectPage.getCellText(row, column)).not.toBeEmpty();
    //  await expect(projectPage.getCellText(row + 1, column)).not.toBeEmpty();
  }

  public static async expectTableToBeDisplayed(page: Page, table: Table) {
    await this.expectCellTableToBeDisplayed(
      page,
      table.getFirstCellCoord(),
      table.getLeft()
    );
  }

  public static async createEmptyProject(
    browser: Browser,
    projectName: string
  ) {
    const initPage = await browser.newPage();
    await initPage.goto('/');
    const startPage = new ProjectSelection(initPage);
    const folderNames = TestFixtures.getFolderName();
    await startPage.addNewProject(projectName, folderNames);
    if (this.bucketId === '') {
      const projectUrl = initPage.url();
      this.bucketId = projectUrl.split('bucket=')[1].split('&')[0];
    }
    await initPage.close();
  }

  public static async openProject(page: Page, projectName: string) {
    const folderNames = TestFixtures.getFolderName();
    const url = `/project/${projectName}/Sheet1?projectBucket=${
      this.bucketId
    }&projectPath=${folderNames.join('/')}`;
    await page.goto(url);
  }

  public static async deleteProject(browser: Browser, projectName: string) {
    const cleaningPage = await browser.newPage();
    await cleaningPage.goto('/');
    const startPage = new ProjectSelection(cleaningPage);
    const folderName = TestFixtures.getFolderName();
    await startPage.openProject(projectName, folderName);
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

  private static generateGUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;

      return v.toString(16);
    });
  }

  public static addGuid(source: string) {
    return source + this.generateGUID();
  }
}
