import { expect } from '@playwright/test';

import { BaseComponent } from './BaseComponent';

export class Autocomplete extends BaseComponent {
  private rootElement = 'div.monaco-list';

  private itemsList = 'div.monaco-list-rows';

  private item = 'div.monaco-list-row';

  private textLabel = 'a.label-name';

  private allFormulas = 'button.formulas-trigger';

  public async isIntellisenseVisible() {
    await new Promise((resolve) => setTimeout(resolve, 100));

    return this.innerPage.locator(this.rootElement).isVisible();
  }

  public async intellisenseShouldBeVisible() {
    await expect(this.innerPage.locator(this.rootElement)).toBeVisible();
  }

  public async intellisenseShouldBeHidden() {
    await expect(this.innerPage.locator(this.rootElement)).toBeHidden();
  }

  public async getSuggestionsList() {
    return await this.innerPage
      .locator(this.itemsList)
      .locator(this.textLabel)
      .allTextContents();
  }

  public async selectSuggestion(suggestion: string) {
    await this.innerPage
      .locator(this.rootElement)
      .getByText(suggestion)
      .click();
  }

  public async closeAutocomplete() {
    await this.innerPage.keyboard.press('Escape');
  }

  public async openFormulasList() {
    await this.innerPage.locator(this.allFormulas).click();
  }
}
