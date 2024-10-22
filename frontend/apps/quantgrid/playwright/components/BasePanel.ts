import { expect } from '@playwright/test';

import { BaseComponent } from './BaseComponent';

export class BasePanel extends BaseComponent {
  private hideElement = 'div>span.stroke-textSecondary.ml-2';

  protected panelName: string;

  private panelItemsStart = 'div.items-start';

  protected getPanelRootLocator() {
    return this.innerPage.locator(
      `${this.panelItemsStart}:has( span.text-textSecondary:has-text('${this.panelName}'))`
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
