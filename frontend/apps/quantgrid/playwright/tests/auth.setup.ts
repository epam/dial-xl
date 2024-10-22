import * as fs from 'fs';

import { expect, test as setup } from '@playwright/test';

import { LoginPage } from '../pages/LoginPage';
import { ProjectSelection } from '../pages/ProjectSelection';
import { TestFixtures } from './TestFixtures';

const authFile = 'playwright/.auth/user.json';

const username = process.env['QUANTGRID_TEST_USERNAME'];
const password = process.env['QUANTGRID_TEST_PASSWORD'];
const authType = process.env['AUTH_TYPE'];
const authEnabled = true;

setup('authenticate', async ({ page }) => {
  await page.goto('/');
  // Perform authentication steps. Replace these actions with your own.
  if (authEnabled) {
    let loginPage: LoginPage | undefined;
    switch (authType) {
      case 'keycloak':
        loginPage = LoginPage.createKeycloakPage(page);
        break;
      case 'auth0':
        loginPage = LoginPage.createAuth0Page(page);
        break;
      default:
        loginPage = undefined;
    }
    if (loginPage) await loginPage.doLogin(username, password);
  }
  const startPage = new ProjectSelection(page);
  await expect(startPage.getWelcomeElement()).toBeVisible();
  await startPage.switchToAllProjects();
  const rootFolder = 'autotests';
  if (!(await startPage.isFolderPresent(rootFolder))) {
    await startPage.createFolder(rootFolder);
  }
  await startPage.openFolder(rootFolder);
  const date = new Date();
  const day = date.getDate() > 9 ? date.getDate() : '0' + date.getDate();
  const month =
    date.getMonth() > 8 ? date.getMonth() + 1 : '0' + (date.getMonth() + 1);
  const dateFormat = `${day}${month}${date.getFullYear()}`;
  await startPage.cleanEverythingExceptCurrent(dateFormat);
  if (!(await startPage.isFolderPresent(dateFormat))) {
    await startPage.createFolder(dateFormat);
  }
  await startPage.openFolder(dateFormat);
  const folderName = TestFixtures.addGuid('autotest_folder');
  await startPage.createFolder(folderName);
  fs.writeFileSync('./folderName.txt', rootFolder + '\n');
  fs.writeFileSync('./folderName.txt', dateFormat + '\n', { flag: 'a+' });
  fs.writeFileSync('./folderName.txt', folderName, { flag: 'a+' });
  await startPage.addNewProject('autotest_empty', [
    rootFolder,
    dateFormat,
    folderName,
  ]);

  // End of authentication steps.

  await page.context().storageState({ path: authFile });
});
