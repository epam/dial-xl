import { expect } from '@playwright/test';

import { BaseComponent } from './BaseComponent';

export class ImportForm extends BaseComponent {
  private sourcesList = 'div.ant-modal-container div.grid';

  private buttonNext = 'button:has-text("Next")';

  private searchButton = 'input[placeholder="Search source..."]';

  public async chooseDataSource(sourceName: string) {
    await this.innerPage
      .locator(this.sourcesList)
      .getByText(sourceName, { exact: true })
      .click();
  }

  public async clickNext() {
    await this.innerPage
      .getByLabel('Create Source')
      .locator(this.buttonNext)
      .click();
  }

  public async verifyFields(expectedFields: string[]) {
    for (const fieldName of expectedFields) {
      await expect(this.innerPage.locator(`#${fieldName}`)).toBeVisible();
    }
  }
}
