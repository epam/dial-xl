import { expect } from '@playwright/test';

import { BaseComponent } from './BaseComponent';

export class Chat extends BaseComponent {
  private chatFrame = 'iframe[name="overlay"]';

  private chatPromptInput = '[data-qa="chat-textarea"]';

  private applySuggestion =
    'button[type="button"]:has-text("Apply suggestion")';

  private sendButton = 'button[data-qa="send"]';

  private stageCompleted = '[data-qa="stage-completed"]';

  private completedStageDescription = 'span[data-qa="stage-closed"]';

  private promptDisplay = 'div[data-qa="message-content"]';

  private answerContent = 'div[data-qa="message-content"]>div>div>p';

  private suggestedChanges = 'span[title="Suggested changes"]';

  private changedDsl =
    'button[data-qa="message-stage"]:last-of-type+div div.codeblock code';

  private agentName = 'span[data-qa="agent-name"]';

  private loginAuth0 = 'button>#provider-logo';

  private authType = process.env['AUTH_TYPE'];

  public async waitForChat() {
    if (this.authType === 'keycloak') {
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
    } else {
      await expect(
        this.innerPage
          .locator(this.chatFrame)
          .contentFrame()
          .locator(this.loginAuth0)
      ).toBeVisible();
    }
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
      this.innerPage.frameLocator(this.chatFrame).locator(this.promptDisplay)
    ).toBeVisible();
    await expect(
      this.innerPage.frameLocator(this.chatFrame).locator(this.promptDisplay)
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
      this.innerPage.frameLocator(this.chatFrame).locator(this.answerContent)
    ).toContainText(textToHave);
  }

  public async applyBotSuggestion() {
    await this.innerPage.locator(this.applySuggestion).click();
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
}
