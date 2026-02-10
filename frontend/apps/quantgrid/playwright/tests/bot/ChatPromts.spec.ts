/* eslint-disable playwright/expect-expect */
import test, { BrowserContext, expect, Page } from '@playwright/test';

import { Chat } from '../../components/Chat';
import { checkFileExistsWithTimeout } from '../../FileUtils';
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

test.describe('Chat', () => {
  test(`Open project, chat panel closed 
        Open chat panel
        Chat form's content is displayed
       `, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
  });

  test(`Open project, 1 table & 2 fields
        Ask bot to of 2 fields sum
        Answer&sum are displayed`, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    /*const chatForm = new Chat(page);
    await chatForm.startNewConversation();
    await chatForm.waitForChat();
    const prompt = 'What is the sum of values of the field Field2 in table X?';
    await chatForm.sendMessage(prompt);
    await chatForm.verifyPrompt(prompt);
    await chatForm.verifyAnswer('42');
    await chatForm.waitUntilResponseComplete();*/
  });

  test(`Open project, 1 table with numeric column
        Ask bot of average field's value
        Bot stages & changes are displayed`, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    /*  await chatForm.startNewConversation();
    await chatForm.waitForChat();
    const prompt = 'What is average value of field Field1 in table X?';
    await chatForm.sendMessage(prompt);
    await chatForm.verifyPrompt(prompt);
    await chatForm.waitUntilResponseComplete();
    await chatForm.verifyStages();
    await chatForm.suggestedChangesShouldPresent();*/
    /*const suggestedChange = (await chatForm.getSuggestedChange()) || '';
    await chatForm.applyBotSuggestion();
    const editor = projectPage.getEditor();
    await editor.shouldContain(suggestedChange);*/
  });

  test(`Open empty project
        Ask bot to add new table, 2 fields, apply suggestion
        The table is created`, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    /* await chatForm.startNewConversation();
    await chatForm.waitForChat();
    const prompt =
      'Add a new table with 2 fields, where the first field is the row index from 1 to 5 and the second field always equals to 3';
    await chatForm.sendMessage(prompt);
    await chatForm.verifyPrompt(prompt);
    await chatForm.waitUntilResponseComplete();
    await chatForm.verifyStages();
    await chatForm.suggestedChangesShouldPresent();
    const suggestedChange = (await chatForm.getSuggestedChange()) || '';
    await chatForm.applyBotSuggestion();
    const editor = projectPage.getEditor();
    await editor.shouldContain(suggestedChange);*/
  });

  test(`Open empty project
        Ask bot to add new table, discard changes
        Dsl is unchanged`, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    /* await chatForm.startNewConversation();
    await chatForm.waitForChat();
    const dslValue = projectPage.getEditor().getEditorText();
    const prompt =
      'Add a new table with 2 fields, where the first field is the row index from 1 to 5 and the second field always equals to 3';
    await chatForm.sendMessage(prompt);
    await chatForm.verifyPrompt(prompt);
    await chatForm.waitUntilResponseComplete();
    await chatForm.verifyStages();
    await chatForm.suggestedChangesShouldPresent();
    //  const suggestedChange = (await chatForm.getSuggestedChange()) || '';
    await chatForm.discardChanges();
    const editor = projectPage.getEditor();
    expect(await editor.getEditorText()).toBe(dslValue);*/
  });

  test(`Open project with conversation
        Click 'Create new conversation'
        New conversation created`, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    /*  const chatForm = new Chat(page);
    await chatForm.startNewConversation();
    await chatForm.waitForChat();
    expect(await chatForm.conversationIsEmpty()).toBeTruthy();*/
  });

  test(`Open non-empty project with conversation
        Click 'Regenerate'
        Bot generated new reponse`, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    await chatForm.waitForChat();
    /*await chatForm.regenerateResponse();
    await chatForm.waitUntilResponseComplete();
    await chatForm.verifyStages();
    await chatForm.suggestedChangesShouldPresent();*/
  });

  test(`Open empty project and ask bot to add new table
        Wait until response complete and click regenerate
        No changes in dsl`, async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.openChat();
    const chatForm = new Chat(page);
    /* await chatForm.startNewConversation();
    await chatForm.waitForChat();
    const prompt =
      'Add a new table with 2 fields, where the first field is the row index from 1 to 5 and the second field always equals to 3';
    await chatForm.sendMessage(prompt);
    await chatForm.verifyPrompt(prompt);
    await chatForm.waitUntilResponseComplete();
    await chatForm.verifyStages();
    await chatForm.suggestedChangesShouldPresent();
    await chatForm.regenerateResponse();
    await chatForm.waitUntilResponseComplete();
    await chatForm.verifyStages();
    await chatForm.suggestedChangesShouldPresent();*/
  });

  test(`Open empty project and ask bot to add new table
        Wait until response complete and click 'Focus'
        Suggested changes highlighted`, async () => {
    /*const { projectPage, chatForm } = await processPrompt(
      "Add a new table with 2 fields named 'Name' and 'Value' and set their values to 'Revenue' and '342.3'"
    );
    await chatForm.focusChanges();
    await projectPage.checkGridSelectionIndexes(
      spreadsheet.getTable(0).getTop(),
      spreadsheet.getTable(0).getLeft()
    );*/
  });

  test(`Open empty project and ask bot to do something
        Wait until response complete and click 'Edit', then change response and save
        Response text updated`, async () => {
    /*const { projectPage, chatForm } = await processPrompt(
      "Add a new table with 2 fields named 'Name' and 'Value' and set their values to 'Revenue' and '342.3'"
    );*/
    //  await chatForm.editResponse();
    //await chatForm.verifyResponseContains();
  });

  test(`Open empty project and ask bot to do something
        Wait until response complete and click 'Edit', then click Cancel
        No changes in dsl and response text`, async () => {
    /*const { projectPage, chatForm } = await processPrompt(
      "Add a new table with 2 fields named 'Name' and 'Value' and set their values to 'Revenue' and '342.3'"
    );*/
    //  await chatForm.editResponse();
    //await chatForm.verifyResponseContains();
  });

  test(`Open non-empty project
        Rename current conversation
        Conversation name updated`, async () => {
    const { chatForm } = await prepareChat();
    /* const newName = 'Conversation new name';
    await chatForm.renameConversation(newName);
    await chatForm.expectConversationNameToBe(newName);*/
  });

  test(`Open non-empty project
        Delete current conversation
        Conversation disappears`, async () => {
    const { chatForm } = await prepareChat();
    /* const name = (await chatForm.getConversationName()) || '';
    await chatForm.deleteConversation();
    await chatForm.expectConversationNameNotToBe(name);*/
  });

  test(`Open non-empty project
        Export current conversation
        json file saved`, async () => {
    /*const { projectPage, chatForm } = await processPrompt(
      "Add a new table with 2 fields named 'Name' and 'Value' and set their values to 'Revenue' and '342.3'"
    );
    await chatForm.exportConversation();
    await checkFileExistsWithTimeout('DIALXL-conversation-', 20000);*/
  });

  test(`Open non-empty project
        Import conversation from json
        conversation displayed`, async () => {
    /* const { projectPage, chatForm } = await processPrompt(
      "Add a new table with 2 fields named 'Name' and 'Value' and set their values to 'Revenue' and '342.3'"
    );
    await chatForm.importConversation(
      './apps/quantgrid/playwright/resources/DIALXL-conversation-2025-08-06T09_38_07.833Z.json'
    );
    await chatForm.verifyResponseContains(
      'How many rows testcases table have?'
    );*/
  });

  test(`Open non-empty project
        Create playback
        playback created`, async () => {
    /* const { projectPage, chatForm } = await processPrompt(
      "Add a new table with 2 fields named 'Name' and 'Value' and set their values to 'Revenue' and '342.3'"
    );
    await chatForm.createPlayBack();
    await chatForm.shouldBePlayback();*/
  });
});
