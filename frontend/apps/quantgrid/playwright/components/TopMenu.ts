import { BaseComponent } from './BaseComponent';

export class TopMenu extends BaseComponent {
  public getMenuItem(itemName: string) {
    return `div[data-menu-id*="${itemName}"]`;
  }

  public async clickOnDropdownItem(itemName: string) {
    await this.innerPage.getByText(itemName, { exact: true }).click();
  }

  public async hoverOverItem(itemName: string) {
    await this.innerPage.getByText(itemName, { exact: true }).hover();
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
