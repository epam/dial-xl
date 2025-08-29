import { expect, Locator, Page } from '@playwright/test';

import { Autocomplete } from './AutocompleteList';
import { BaseComponent } from './BaseComponent';

export class Editor extends BaseComponent {
  private rootElement: Locator;

  private lineLocator = 'div.view-line';

  private tokenInLine = '>span>span';

  private noSuggestionsMessage = 'div.editor-widget>div.message';

  private hideTooltip = 'span>span.cursor-pointer';

  private autocomplete: Autocomplete;

  constructor(page: Page, root: Locator) {
    super(page);
    this.rootElement = root;
    this.autocomplete = new Autocomplete(this.innerPage);
  }

  public async shouldBeVisible() {
    await expect(this.rootElement).toBeVisible();
  }

  public async shouldBeHidden() {
    await expect(this.rootElement).toBeHidden();
  }

  public async shouldContain(text: string) {
    //  await expect(this.rootElement).toContainText(text);
  }

  public getValueLocator() {
    return this.rootElement.locator(this.lineLocator);
  }

  public async applyDSL(dsl: string) {
    await this.setValueWithoutClean(dsl);
    await this.saveDsl();
  }

  public async setValueWithoutClean(dsl: string) {
    await this.typeValue(dsl);
    await this.innerPage.keyboard.press('Enter');
  }

  public async closeTooltip() {
    await this.innerPage
      .locator(this.hideTooltip)
      .and(this.innerPage.getByText('X'))
      .click();
  }

  public async setValue(dsl: string, countToClean: number, clickNeeded = true) {
    if (clickNeeded) await this.rootElement.click();
    await this.removeCharaters(countToClean);
    await this.typeValue(dsl, false);
  }

  public async findLineByText(text: string) {
    this.innerPage.locator(this.lineLocator).filter({ hasText: text });
  }

  public async replaceTextInLine(
    lineLocator: Locator,
    oldText: string,
    newText: string
  ) {
    await lineLocator.click();
    await this.rootElement.press('Home');
    const startLocation =
      (await lineLocator.textContent())?.indexOf(oldText) || 0;
    for (let i = 0; i < startLocation; i++) {
      await this.rootElement.press('ArrowRight');
    }
    for (let i = 0; i < oldText.length; i++) {
      await this.rootElement.press('Delete');
    }
    await this.innerPage.keyboard.type(newText);
  }

  public async focus() {
    await this.rootElement.click();
  }

  public async removeCharaters(countToClean: number) {
    for (let i = 0; i < countToClean; i++) {
      await this.innerPage.keyboard.press('Backspace', { delay: 50 });
    }
  }

  public async setValueAndCancel(dsl: string, clickNeeded = true) {
    await this.typeValue(dsl, clickNeeded);
    await this.cancelSettingValue();
  }

  public async cancelSettingValue() {
    await this.innerPage.keyboard.press('Escape');
  }

  public async typeValue(
    dsl: string,
    clickNeeded = true,
    closeIntellisense = true
  ) {
    if (clickNeeded) await this.rootElement.click();
    const lines = dsl.split('\n');
    let counter = 0;
    for (const line of lines) {
      counter++;
      if (lines.length === 1) {
        const firstSym = line.charAt(0);
        await this.rootElement.pressSequentially(firstSym);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await this.rootElement.pressSequentially(line.substring(1), {
          delay: 20,
        });
      } else {
        await this.innerPage.keyboard.type(line, { delay: 20 });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (
        closeIntellisense &&
        (await this.autocomplete.isIntellisenseVisible())
      ) {
        await this.innerPage.keyboard.press('Escape');
      }
      if (lines.length > counter) {
        await this.innerPage.keyboard.press('Enter');
      }
    }
  }

  public async requestIntellisense() {
    await this.innerPage.keyboard.press('Control+Space');
  }

  public async saveDsl() {
    await this.innerPage.keyboard.press('Control+S');
  }

  public async finishLine() {
    await this.innerPage.keyboard.press('Enter');
  }

  public async setTokenValue(
    line: number,
    column: number,
    oldLength: number,
    newValue: string
  ) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    //console.log(line)
    //console.log(await this.rootElement.locator(this.lineLocator).count())
    await this.rootElement.locator(this.lineLocator).nth(line).click();
    await this.rootElement.press('Home');
    for (let i = 0; i < column; i++) {
      await this.rootElement.press('ArrowRight');
    }
    for (let i = 0; i < oldLength; i++) {
      await this.rootElement.press('Backspace');
    }
    await this.rootElement.pressSequentially(newValue);
  }

  public getIntellisensePopup() {
    return this.autocomplete;
  }

  public async expectNoSuggestionsMessageToBeVisible() {
    await expect(
      this.innerPage.locator(this.noSuggestionsMessage)
    ).toBeVisible();
    await expect(
      this.innerPage.locator(this.noSuggestionsMessage)
    ).toContainText('No suggestions');
  }

  public async getEditorText() {
    return await this.getValueLocator().textContent();
  }
}
