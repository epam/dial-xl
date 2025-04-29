/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

import { MenuItems } from '../../enums/MenuItems';
import { Panels } from '../../enums/Panels';
import { PanelsMenuItems, ViewMenuItems } from '../../enums/ViewMenuItems';
import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_viewmenu');

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

test.beforeAll(async ({ browser }) => {
  await TestFixtures.createEmptyProject(storagePath, browser, projectName);
  browserContext = await browser.newContext({ storageState: storagePath });
});

test.beforeEach(async () => {
  page = await browserContext.newPage();
  await TestFixtures.openProject(page, projectName);
  const projectPage = await ProjectPage.createCleanInstance(page);
  await projectPage.hideAllPanels();
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async ({ browser }) => {
  await browserContext.close();
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('view menu', () => {
  //Project Tree
  test('show project tree', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.ProjectTree
    );
    await projectPage.expectPanelToBeVisible(Panels.ProjectTree);
  });

  test('hide project tree', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.ProjectTree
    );
    await projectPage.expectPanelToBeVisible(Panels.ProjectTree);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.ProjectTree
    );
    await projectPage.expectPanelToBeHidden(Panels.ProjectTree);
  });
  //Project tree hotkey
  test('show project tree hotkey', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await page.keyboard.press('Alt+1');
    await projectPage.expectPanelToBeVisible(Panels.ProjectTree);
  });

  test('hide project tree hotkey', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.ProjectTree
    );
    await projectPage.expectPanelToBeVisible(Panels.ProjectTree);
    await page.keyboard.press('Alt+1');
    await projectPage.expectPanelToBeHidden(Panels.ProjectTree);
  });

  // Code Editor
  test('show code editor', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.CodeEditor
    );
    await projectPage.expectPanelToBeVisible(Panels.EditorPanel);
  });

  test('hide code editor', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.CodeEditor
    );
    await projectPage.expectPanelToBeVisible(Panels.EditorPanel);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.CodeEditor
    );
    await projectPage.expectPanelToBeHidden(Panels.EditorPanel);
  });
  // Code editor hotkey
  test('show code editor hotkey', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);

    await page.keyboard.press('Alt+2');
    await projectPage.expectPanelToBeVisible(Panels.EditorPanel);
  });

  test('hide code editor hotkey', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.CodeEditor
    );
    await projectPage.expectPanelToBeVisible(Panels.EditorPanel);
    await page.keyboard.press('Alt+2');
    await projectPage.expectPanelToBeHidden(Panels.EditorPanel);
  });
  //Inputs
  test('show inputs', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.Inputs
    );
    await projectPage.expectPanelToBeVisible(Panels.InputsPanel);
  });

  test('hide inputs', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.Inputs
    );
    await projectPage.expectPanelToBeVisible(Panels.InputsPanel);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.Inputs
    );
    await projectPage.expectPanelToBeHidden(Panels.InputsPanel);
  });
  // inputs hotkey
  test('show inputs hotkey', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await page.keyboard.press('Alt+3');
    await projectPage.expectPanelToBeVisible(Panels.InputsPanel);
  });

  test('hide inputs hotkey', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.Inputs
    );
    await projectPage.expectPanelToBeVisible(Panels.InputsPanel);
    await page.keyboard.press('Alt+3');
    await projectPage.expectPanelToBeHidden(Panels.InputsPanel);
  });
  //Error Panel
  test('show errors', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.ErrorPanel
    );
    await projectPage.expectPanelToBeVisible(Panels.ErrorsPanel);
  });

  test('hide errors', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.ErrorPanel
    );
    await projectPage.expectPanelToBeVisible(Panels.ErrorsPanel);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.ErrorPanel
    );
    await projectPage.expectPanelToBeHidden(Panels.ErrorsPanel);
  });
  // Error hotkey
  test('show errors hotkey', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await page.keyboard.press('Alt+4');
    await projectPage.expectPanelToBeVisible(Panels.ErrorsPanel);
  });

  test('hide errors hotkey', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.ErrorPanel
    );
    await projectPage.expectPanelToBeVisible(Panels.ErrorsPanel);
    await page.keyboard.press('Alt+4');
    await projectPage.expectPanelToBeHidden(Panels.ErrorsPanel);
  });
  //History Panel
  test('show history', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.HistoryPanel
    );
    await projectPage.expectPanelToBeVisible(Panels.HistoryPanel);
  });

  test('hide history', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.HistoryPanel
    );
    await projectPage.expectPanelToBeVisible(Panels.HistoryPanel);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.HistoryPanel
    );
    await projectPage.expectPanelToBeHidden(Panels.HistoryPanel);
  });
  // History hotkey
  test('show history hotkey', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await page.keyboard.press('Alt+5');
    await projectPage.expectPanelToBeVisible(Panels.HistoryPanel);
  });

  test('hide history hotkey', async () => {
    const projectPage = await ProjectPage.createCleanInstance(page);
    await projectPage.performMenuSubCommand(
      MenuItems.View,
      ViewMenuItems.Panels,
      PanelsMenuItems.HistoryPanel
    );
    await projectPage.expectPanelToBeVisible(Panels.HistoryPanel);
    await page.keyboard.press('Alt+5');
    await projectPage.expectPanelToBeHidden(Panels.HistoryPanel);
  });
});
