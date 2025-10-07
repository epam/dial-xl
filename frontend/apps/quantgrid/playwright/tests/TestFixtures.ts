import * as fs from 'fs';
import * as path from 'path';

import { workspaceRoot } from '@nx/devkit';
import { Browser, expect, Page } from '@playwright/test';

import { WorkArea } from '../components/abstractions/WorkArea';
import { Canvas } from '../components/Canvas';
import { Chat } from '../components/Chat';
import { DeleteProjectForm } from '../components/DeleteProjectForm';
import { Grid } from '../components/Grid';
import { FileMenuItems } from '../enums/FileMenuItems';
import { MenuItems } from '../enums/MenuItems';
import {
  expectCellTextToBe,
  expectCellTextToBePresent,
} from '../helpers/canvasExpects';
import { SpreadSheet } from '../logic-entities/SpreadSheet';
import { Table } from '../logic-entities/Table';
import { ProjectPage } from '../pages/ProjectPage';
import { ProjectSelection } from '../pages/ProjectSelection';

export class TestFixtures {
  public static bucketId = '';

  public static MODE_TYPE = process.env['VISUAL_MODE'] || 'canvas';

  public static getVisualComponent(page: Page): WorkArea {
    if (this.MODE_TYPE === 'grid') return new Grid(page);
    else return new Canvas(page);
  }

  public static getFolderName() {
    const folderNameFile = path.join(
      workspaceRoot,
      'playwright',
      'run-state',
      'folderName.txt'
    );

    return fs.readFileSync(folderNameFile, 'utf-8').trim().split('\n');
  }

  public static async createProjectNew(
    storagePath: string,
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
    await this.setDataMode(projectPage);
    await this.expectCellTableToBeDisplayed(
      workPage,
      spreadsheet.getTable(0).getTop(),
      spreadsheet.getTable(0).getLeft()
    );
    if (this.bucketId === '') {
      const projectUrl = workPage.url();
      this.bucketId = projectUrl.split('projectBucket=')[1].split('&')[0];
    }
    if (storagePath && storagePath !== '') {
      await workPage.context().storageState({ path: storagePath });
    }
    if (workPage !== initPage) {
      await workPage.close();
    }
    await initPage.close();
  }

  public static async setDataMode(page: ProjectPage) {
    if (
      this.MODE_TYPE === 'grid' &&
      !(await page.getVisualization().isVisible())
    ) {
      await page.performMenuCommand(MenuItems.Help, 'Toggle grid');
    }
  }

  public static async createProject(
    storagePath: string,
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
    await this.setDataMode(projectPage);
    await expectCellTextToBe(
      <Canvas>projectPage.getVisualization(),
      rowToCheck,
      columnToCheck,
      nameToCheck
    );
    /* expect(await projectPage.getCellText(rowToCheck, columnToCheck)).toBe(
      nameToCheck
    );*/
    if (this.bucketId === '') {
      const projectUrl = workPage.url();
      this.bucketId = projectUrl.split('projectBucket=')[1].split('&')[0];
    }
    if (storagePath && storagePath !== '') {
      await workPage.context().storageState({ path: storagePath });
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
    //await this.changeDataMode(projectPage);
    await expectCellTextToBePresent(
      <Canvas>projectPage.getVisualization(),
      row,
      column
    );
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
    storagePath: string,
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
    if (storagePath && storagePath !== '') {
      await initPage.context().storageState({ path: storagePath });
    }
    await initPage.close();
  }

  public static async openProject(page: Page, projectName: string) {
    const folderNames = TestFixtures.getFolderName();
    const url = `/project/${projectName}/Sheet1?projectBucket=${
      this.bucketId
    }&projectPath=${folderNames.join('/')}`;
    await page.goto(url);
    await this.setDataMode(await ProjectPage.createInstance(page));
  }

  public static async deleteProject(browser: Browser, projectName: string) {
    const cleaningPage = await browser.newPage();
    await cleaningPage.goto('/');
    const startPage = new ProjectSelection(cleaningPage);
    const folderName = TestFixtures.getFolderName();
    await startPage.openFolders(folderName);
    await startPage.deleteFile(projectName);
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
