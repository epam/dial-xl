import { BaseComponent } from './BaseComponent';

export class SearchForm extends BaseComponent {
  private rootElement = 'div.ant-modal-body';

  private searchField = 'input[type="text"]';

  private searchResultText = '[class*="SearchWindow_result"]>:nth-child(2)';

  private noResultsText = 'No results.';

  public async switchTab(entityName: string) {
    await this.innerPage
      .locator(this.rootElement)
      .getByText(entityName, { exact: true })
      .click();
  }

  public async search(text: string) {
    await this.innerPage
      .locator(this.rootElement)
      .locator(this.searchField)
      .fill(text);
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
}
