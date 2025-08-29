import test, { BrowserContext, Page } from '@playwright/test';

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
  Table1.addField(new Field('Field1', 'RANGE(6)'));
  Table1.addField(new Field('Field2', '7'));
  spreadsheet.addTable(Table1);
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

async function prepareChat() {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.openChat();
  const chatForm = new Chat(page);
  await chatForm.startNewConversation();
  await chatForm.waitForChat();

  return { projectPage, chatForm };
}
async function processPrompt(prompt: string) {
  const { projectPage, chatForm } = await prepareChat();
  //   const prompt =
  //     'Add a new table with 2 fields, where the first field is the row index from 1 to 5 and the second field always equals to 3';
  await chatForm.sendMessage(prompt);
  await chatForm.verifyPrompt(prompt);
  await chatForm.waitUntilResponseComplete();

  return { projectPage, chatForm };
}

test.describe('Playback', () => {
  test(`Conversation with one action
        Create playback and play it
        Only 1 action is performed. States in the beginning and in the end are correct
       `, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
  });

  test(`Conversation with several actions
        Create playback and play it consecutive
        Bot actions performed one by one. States after each step are correct
       `, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
  });

  test(`Conversation with two actions and manual actions between
        Create playback and play it
        Bot actions performed one by one. Manual actions that made before each step are added
       `, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
  });

  test(`Conversation with two actions
        Create playback and play one action, then stop playback
        The latest project state is restored correctly
       `, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
  });

  test(`Conversation with two actions
        Create playback and play one action, then hit back
        The project is the state before any playback actions
       `, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
  });

  test(`Conversation with two actions
        Create playback and play 2 actions forward, 1 action back, 1 action forward
        All steps show correct project states. The final state matches the end of playback state
       `, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
  });

  test(`Conversation with one action
        Create playback and try to type into canvas
        No changes in canvas, typing ignored
       `, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
  });

  test(`Conversation with one action
        Create playback and try to type into dsl editor
        No changes in editor, typing ignored
       `, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
  });

  test(`Conversation with one action
        Create playback and try to type into formula bar
        No changes in project, typing ignored
       `, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
  });

  test(`Conversation with one action
        Create playback and then clone the project
        New project with matching state created
       `, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
  });
});
