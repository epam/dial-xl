import { expect } from '@playwright/test';

import { BaseComponent } from './BaseComponent';

export class ShareForm extends BaseComponent {
  private shareLinkLabel = "input[placeholder='Share link']";

  private copyButton = this.shareLinkLabel + "+button>span[role='img']";

  public async getShareLink() {
    await expect(this.innerPage.locator(this.shareLinkLabel)).toBeVisible();
    await expect(this.innerPage.locator(this.copyButton)).toBeVisible();

    return await this.innerPage.locator(this.shareLinkLabel).inputValue();
  }
}
