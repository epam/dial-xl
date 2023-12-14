import { expect } from '@playwright/test';

import { BaseComponent } from './BaseComponent';

export class BasePanel extends BaseComponent {
  private hideElement = 'div>[aria-label="vertical-align-bottom"]';

  protected panelName: string;

  private panelItemsStart = 'div.items-start';

  private getPanelRootLocator() {
    return this.innerPage.locator(
      `div.items-start:has-text('${this.panelName}')`
    );
    //     return this.innerPage.locator(this.panelItemsStart).getByText(this.panelName, {exact: true});
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
