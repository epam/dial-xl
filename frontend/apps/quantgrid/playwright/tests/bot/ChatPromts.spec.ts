/* eslint-disable playwright/expect-expect */
import test, { BrowserContext, expect, Page } from '@playwright/test';

import { Chat } from '../../components/Chat';
import { Field } from '../../logic-entities/Field';
import { SpreadSheet } from '../../logic-entities/SpreadSheet';
import { Table } from '../../logic-entities/Table';
import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_chat');

const spreadsheet: SpreadSheet = new SpreadSheet();

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

test.beforeAll(async ({ browser }) => {
  const Table1 = new Table(2, 2, 'X');
  Table1.addField(new Field('Field1', 'RANGE(5)'));
  Table1.addField(new Field('Field2', '7'));
  await TestFixtures.createProjectNew(
    storagePath,
    browser,
    projectName,
    spreadsheet
  );
  browserContext = await browser.newContext({ storageState: storagePath });
});

test.beforeEach(async () => {
  page = await browserContext.newPage();
  await TestFixtures.openProject(page, projectName);
  await TestFixtures.expectTableToBeDisplayed(page, spreadsheet.getTable(0));
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async ({ browser }) => {
  await browserContext.close();
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('Chat', () => {
  test('chat form can be open', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    expect(await chatForm.waitForChat()).toBeTruthy();
  });

  test('chat prompt works', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
    const prompt = 'What is the sum of values of the field Field2 in table X?';
    await chatForm.sendMessage(prompt);
    await chatForm.verifyPrompt(prompt);
    await chatForm.verifyAnswer('35');
  });

  test('apply suggestion test complex', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
    const prompt = 'What is average value of field Field1 in table X?';
    await chatForm.sendMessage(prompt);
    await chatForm.verifyPrompt(prompt);
    await chatForm.verifyStages();
    await chatForm.suggestedChangesShouldPresent();
    const suggestedChange = (await chatForm.getSuggestedChange()) || '';
    await chatForm.applyBotSuggestion();
    const editor = projectPage.getEditor();
    await editor.shouldContain(suggestedChange);
  });

  test('apply suggestion create table', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
    const prompt =
      'Add a new table with 2 fields, where the first field is the row index from 1 to 5 and the second field always equals to 3';
    await chatForm.sendMessage(prompt);
    await chatForm.verifyPrompt(prompt);
    await chatForm.verifyStages();
    await chatForm.suggestedChangesShouldPresent();
    const suggestedChange = (await chatForm.getSuggestedChange()) || '';
    await chatForm.applyBotSuggestion();
    const editor = projectPage.getEditor();
    await editor.shouldContain(suggestedChange);
  });
});
