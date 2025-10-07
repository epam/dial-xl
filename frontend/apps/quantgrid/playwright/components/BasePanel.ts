import { expect } from '@playwright/test';

import { BaseComponent } from './BaseComponent';

export class BasePanel extends BaseComponent {
  private hideElement = '[data-qa="panel-hide-button"]';

  protected panelName: string;

  //private panelItemsStart = 'div.items-start';

  protected getPanelRootLocator() {
    return this.innerPage.locator(
      `#${this.panelName}-panel[data-panel-active='true']`
    );
  }

  public async closePanel() {
    if (await this.isVisible()) {
      await this.getPanelRootLocator().locator(this.hideElement).click();
    }
  }

  public async isVisible() {
    return await this.getPanelRootLocator().isVisible();
  }

  public async shouldBeVisible() {
    await expect(this.getPanelRootLocator()).toBeVisible();
  }

  public async shouldBeHidden() {
    await expect(this.getPanelRootLocator()).toBeHidden();
  }
}
