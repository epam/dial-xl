import { BasePanel } from './BasePanel';

export class HistoryPanel extends BasePanel {
  panelName = 'History';

  public historyItem(text: string) {
    return this.getPanelRootLocator().locator(`div[title*='${text}']`);
  }

  private historyItemsList = 'div[title]';

  private itemIndex = ' p.ml-auto';

  public getHistoryItems() {
    return this.getPanelRootLocator().locator(this.historyItemsList);
  }

  public getHistoryItemIndex(text: string) {
    return this.historyItem(text).locator(this.itemIndex);
  }
}
