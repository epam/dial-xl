import { expect } from '@playwright/test';

import { BaseComponent } from './BaseComponent';

export class TopMenu extends BaseComponent {
  public getMenuItem(itemName: string) {
    return `div[data-menu-id*="${itemName}"]`;
  }

  public async clickOnDropdownItem(itemName: string) {
    const loc = this.innerPage.locator(
      `span.ant-menu-title-content:has-text("${itemName}")`
    );
    await expect(loc).toBeVisible();
    await loc.click();
  }

  public async hoverOverItem(itemName: string) {
    await this.innerPage
      .locator(`span.ant-menu-title-content:has-text("${itemName}")`)
      .hover();
  }

  public async performAction(topMenuItem: string, dropdownItem: string) {
    await this.innerPage.locator(this.getMenuItem(topMenuItem)).click();
    await this.clickOnDropdownItem(dropdownItem);
  }

  public async performSubAction(
    topMenuItem: string,
    hoverItem: string,
    dropdownItem: string
  ) {
    await this.innerPage.locator(this.getMenuItem(topMenuItem)).click();
    await this.hoverOverItem(hoverItem);
    await this.clickOnDropdownItem(dropdownItem);
  }
}
