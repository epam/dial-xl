import { expect, Locator, Page } from '@playwright/test';

import { BaseComponent } from './BaseComponent';
export class Editor extends BaseComponent {
  private rootElement: Locator;

  private lineLocator = 'div.view-line';

  private tokenInLine = '>span>span';

  constructor(page: Page, root: Locator) {
    super(page);
    this.rootElement = root;
  }

  public async shouldBeVisible() {
    await expect(this.rootElement).toBeVisible();
  }

  public getValueLocator() {
    return this.rootElement.locator(this.lineLocator).locator(this.tokenInLine);
  }

  public async applyDSL(dsl: string) {
    await this.setValueWithoutClean(dsl);
    await this.saveDsl();
  }

  public async setValueWithoutClean(dsl: string) {
    await this.typeValue(dsl);
    await this.innerPage.keyboard.press('Enter');
  }

  public async setValue(dsl: string, countToClean: number, clickNeeded = true) {
    if (clickNeeded) await this.rootElement.click();
    for (let i = 0; i < countToClean; i++) {
      await this.innerPage.keyboard.press('Backspace', { delay: 50 });
    }
    this.typeValue(dsl, false);
  }

  public async setValueAndCancel(dsl: string, clickNeeded = true) {
    await this.typeValue(dsl, clickNeeded);
    await this.innerPage.keyboard.press('Escape');
  }

  public async typeValue(dsl: string, clickNeeded = true) {
    if (clickNeeded) await this.rootElement.click();
    await this.innerPage.keyboard.type(dsl);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  public async saveDsl() {
    await this.innerPage.keyboard.press('Control+S');
  }

  public async setTokenValue(
    line: number,
    column: number,
    oldLength: number,
    newValue: string
  ) {
    await this.rootElement.locator(this.lineLocator).nth(line).click();
    await this.rootElement.press('Home');
    for (let i = 0; i < column; i++) {
      await this.rootElement.press('ArrowRight');
    }
    for (let i = 0; i < oldLength; i++) {
      await this.rootElement.press('Backspace');
    }
    await this.rootElement.type(newValue);
  }
}
