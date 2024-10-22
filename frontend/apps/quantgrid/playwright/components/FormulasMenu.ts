import { expect } from '@playwright/test';

import { BaseComponent } from './BaseComponent';

export class FormulasMenu extends BaseComponent {
  private menuRoot = 'div.formulas-menu';

  private menuItem = 'li.ant-dropdown-menu-item,li.ant-dropdown-menu-submenu';

  public async menuShouldPresent() {
    await expect(this.innerPage.locator(this.menuRoot)).toBeVisible();
  }

  public async menuShouldHidden() {
    await expect(this.innerPage.locator(this.menuRoot)).toBeHidden();
  }

  public async selectItemByPath(itemsList: string[], special = false) {
    const itemLength = itemsList.length;
    for (let i = 0; i < itemLength - 1; i++) {
      await this.innerPage
        .locator(this.menuItem)
        .getByText(itemsList[i], { exact: true })
        .hover();
    }
    if (special) {
      await this.innerPage
        .locator(this.menuItem)
        .getByText(itemsList[itemLength - 1], { exact: true })
        .hover();
    } else {
      await this.innerPage
        .locator(this.menuItem)
        .getByText(itemsList[itemLength - 1], { exact: true })
        .click();
    }
  }
}
