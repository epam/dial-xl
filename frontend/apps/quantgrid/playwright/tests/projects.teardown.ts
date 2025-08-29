import * as fs from 'fs';

import { test as teardown } from '@playwright/test';

import { ProjectSelection } from '../pages/ProjectSelection';
import { TestFixtures } from './TestFixtures';

teardown('clean projects', async ({ page }) => {
  await page.goto('/home');
  const startPage = new ProjectSelection(page);
  const folderName = TestFixtures.getFolderName();
  await startPage.deleteFolder(folderName);
  //await startPage.deleteAllAutotestsProjects(folderName);
});
