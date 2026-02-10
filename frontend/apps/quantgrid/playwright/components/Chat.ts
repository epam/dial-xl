import { expect } from '@playwright/test';

import { waitForCondition } from '../helpers/canvasExpects';
import { BaseComponent } from './BaseComponent';

export class Chat extends BaseComponent {
  private chatFrame = 'iframe[name="overlay"]';

  private chatPromptInput = '[data-qa="chat-textarea"]';

  private applySuggestion = 'button[type="button"]>span:has-text("Accept")';

  private discardChangesButton =
    'button[type="button"]>span:has-text("Discard")';

  private sendButton = 'button[data-qa="send"]';

  private stageCompleted = '[data-qa="stage-completed"]';

  private completedStageDescription = 'span[data-qa="stage-closed"]';

  private promptDisplay = 'div[data-qa="message-content"]';

  private responseText = '[data-qa="message-row"][itemprop="last-row"]';

  private answerContent =
    '[itemprop="last-row"] div[data-qa="message-content"]>div>div:nth-child(2)';

  private suggestedChanges = 'span[title="Suggested changes"]';

  private changedDsl =
    'button[data-qa="message-stage"]:last-of-type+div div.codeblock code';

  private agentName = 'span[data-qa="entity-name"]';

  private loginAuth0 = 'button[data-qa="auth0"]';

  private regenerateButton = '[data-qa="regenerate"]';

  private newConversationButton = "#chat-panel button>span[role='img']";

  private focusButton = "button>span:has-text('Focus')";

  private conversationOptionsMenu = "span.ant-dropdown-open[role='img']";

  private newConversationNameInput = '#newConversationName';

  private confirmAction = "button>span:has-text('OK')";

  private conversationNameLabel = '#chat-panel span.truncate';

  private conversationOption = (option: string) => {
    return `[data-label='${option}']`;
  };

  private authType = process.env['AUTH_TYPE'];
  private username = process.env['QUANTGRID_TEST_USERNAME'] || '';
  private password = process.env['QUANTGRID_TEST_PASSWORD'] || '';

  public async waitForChat() {
    //  if (this.authType === 'keycloak') {
    await expect(
      this.innerPage
        .locator(this.chatFrame)
        .contentFrame()
        .locator(this.chatPromptInput)
    ).toBeVisible();
    await expect(
      this.innerPage
        .locator(this.chatFrame)
        .contentFrame()
        .locator(this.agentName)
    ).toBeVisible();
    /* } else {
      await expect(
        this.innerPage
          .locator(this.chatFrame)
          .contentFrame()
          .locator(this.loginAuth0)
      ).toBeVisible();
    }*/
  }

  public async conversationIsEmpty() {
    await expect(
      this.innerPage
        .locator(this.chatFrame)
        .contentFrame()
        .locator(this.agentName)
    ).toBeVisible();

    return await this.innerPage
      .locator(this.chatFrame)
      .contentFrame()
      .locator(this.agentName)
      .isVisible();
  }

  public async startNewConversation() {
    await this.innerPage.locator(this.newConversationButton).last().click();
  }

  public async waitUntilResponseComplete() {
    await this.innerPage
      .frameLocator(this.chatFrame)
      .locator(this.chatPromptInput)
      .click();
    await expect(
      this.innerPage.frameLocator(this.chatFrame).locator(this.regenerateButton)
    ).toBeVisible({ timeout: 60000 });
  }

  public async regenerateResponse() {
    await this.innerPage
      .frameLocator(this.chatFrame)
      .locator(this.regenerateButton)
      .click();
  }

  public async focusChanges() {
    await this.innerPage
      .frameLocator(this.chatFrame)
      .locator(this.focusButton)
      .click();
  }

  public async chooseConversationAction(action: string) {
    await this.innerPage.locator(this.conversationOptionsMenu).click();
    await this.innerPage.locator(this.conversationOption(action)).click();
  }

  public async renameConversation(newName: string) {
    await this.chooseConversationAction('Rename');
    await this.innerPage.locator(this.newConversationNameInput).fill(newName);
    await this.innerPage.locator(this.confirmAction).click();
  }

  public async expectConversationNameToBe(name: string) {
    await expect(
      this.innerPage.locator(this.conversationNameLabel).last()
    ).toHaveText(name);
  }

  public async getConversationName() {
    return await this.innerPage
      .locator(this.conversationNameLabel)
      .last()
      .textContent();
  }

  public async expectConversationNameNotToBe(name: string) {
    await expect(
      this.innerPage.locator(this.conversationNameLabel).last()
    ).not.toHaveText(name);
  }

  public async deleteConversation() {
    await this.chooseConversationAction('Delete');
    await this.innerPage.locator(this.confirmAction).click();
  }

  public async importConversation(path: string) {
    const fileChooserPromise = this.innerPage.waitForEvent('filechooser');
    await this.chooseConversationAction('Import');

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path);
  }

  public async verifyResponseContains(textToCheck: string) {
    await expect(this.innerPage.locator(this.responseText)).toHaveText(
      textToCheck
    );
  }

  public async exportConversation() {
    await this.chooseConversationAction('Export');
  }

  public async createPlayBack() {
    await this.chooseConversationAction('Create Playback');
  }

  public async shouldBePlayback() {
    await expect(this.innerPage.locator(this.agentName)).toHaveText('Playback');
  }

  public async sendMessage(message: string) {
    await this.innerPage
      .frameLocator(this.chatFrame)
      .locator(this.chatPromptInput)
      .fill(message);
    await this.innerPage
      .frameLocator(this.chatFrame)
      .locator(this.sendButton)
      .click();
  }

  public async verifyPrompt(message: string) {
    await expect(
      this.innerPage
        .frameLocator(this.chatFrame)
        .locator(this.promptDisplay)
        .first()
    ).toBeVisible();
    await expect(
      this.innerPage
        .frameLocator(this.chatFrame)
        .locator(this.promptDisplay)
        .first()
    ).toHaveText(message);
  }

  public async verifyStages() {
    await expect(
      this.innerPage.frameLocator(this.chatFrame).locator(this.stageCompleted)
    ).toBeVisible();
    expect(
      await this.innerPage
        .frameLocator(this.chatFrame)
        .locator(this.stageCompleted)
        .count()
    ).toBe(
      await this.innerPage
        .frameLocator(this.chatFrame)
        .locator(this.completedStageDescription)
        .count()
    );
  }

  public async verifyAnswer(textToHave: string) {
    await expect(
      this.innerPage
        .frameLocator(this.chatFrame)
        .locator(this.answerContent)
        .filter({ hasText: textToHave })
    ).toBeVisible({ timeout: 60000 });
  }

  public async applyBotSuggestion() {
    await this.innerPage.locator(this.applySuggestion).click();
  }

  public async discardChanges() {
    await this.innerPage.locator(this.discardChangesButton).click();
  }

  public async suggestedChangesShouldPresent() {
    await expect(
      this.innerPage.frameLocator(this.chatFrame).locator(this.suggestedChanges)
    ).toBeVisible();
  }

  public async getSuggestedChange() {
    return await this.innerPage
      .frameLocator(this.chatFrame)
      .locator(this.changedDsl)
      .textContent();
  }

  public async asyncLoginAuth0() {
    await waitForCondition(
      async () => {
        return (
          this.innerPage
            .frameLocator(this.chatFrame)
            .locator(this.loginAuth0)
            .isVisible() ||
          this.innerPage.locator(this.newConversationButton).last().isVisible()
        );
      },
      100,
      20000
    );
    if (
      await this.innerPage
        .frameLocator(this.chatFrame)
        .locator(this.loginAuth0)
        .isVisible()
    ) {
      await this.innerPage
        .frameLocator(this.chatFrame)
        .locator(this.loginAuth0)
        .click();
      await this.innerPage
        .frameLocator(this.chatFrame)
        .locator('[name="email"]')
        .fill(this.username);
      await this.innerPage
        .frameLocator(this.chatFrame)
        .locator('[name="password"]')
        .fill(this.password);
      await this.innerPage
        .frameLocator(this.chatFrame)
        .locator('span.auth0-label-submit')
        .click();
    }
  }
}
