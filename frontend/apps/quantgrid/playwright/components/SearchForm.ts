import { expect } from '@playwright/test';

import { BaseComponent } from './BaseComponent';

export enum SearchTabs {
  All = 'All',
  Projects = 'Projects',
  Sheets = 'Sheets',
  Tables = 'Tables',
  Fields = 'Fields',
}

export class SearchForm extends BaseComponent {
  private rootElement = 'div.ant-modal-body';

  private searchField = 'input[type="text"]';

  private searchResultText = ' div.text-textPrimary';

  private selectedTab = 'button.border-b-2';

  private selectedItem = 'div.ant-modal-body div.border-l-2';

  private foundItem = 'div.ant-modal-body div.items-center.cursor-pointer';

  private noResultsText = 'No results.';

  public async switchTab(entityName: string) {
    await this.innerPage
      .locator(this.rootElement)
      .getByText(entityName, { exact: true })
      .click();
  }

  public async switchTabKeyboard() {
    await this.innerPage.keyboard.press('Tab');
  }

  public async switchTabKeyboardReverseOrder() {
    await this.innerPage.keyboard.press('Shift+Tab');
  }

  public async expectTabSelected(tabName: string) {
    await expect(this.innerPage.locator(this.selectedTab)).toHaveText(tabName);
  }

  public async getSearchText() {
    return await this.innerPage
      .locator(this.rootElement)
      .locator(this.searchField)
      .inputValue();
  }

  public async search(text: string) {
    await this.innerPage
      .locator(this.rootElement)
      .locator(this.searchField)
      .fill(text);
  }

  public async expectSelectedItemChange(oldText: string) {
    await expect(this.innerPage.locator(this.selectedItem)).not.toHaveText(
      oldText
    );
  }

  public async getSelectedItemText() {
    return await this.innerPage.locator(this.selectedItem).textContent();
  }

  public getFirstSearchResult() {
    return this.innerPage
      .locator(this.rootElement)
      .locator(this.searchResultText)
      .first();
  }

  public getNoResultsLabel() {
    return this.innerPage.getByText(this.noResultsText);
  }

  public async expectFormToAppear() {
    await expect(this.innerPage.locator(this.rootElement)).toBeVisible();
  }

  public async expectFormToDissapear() {
    await expect(this.innerPage.locator(this.rootElement)).toBeHidden();
  }
}
