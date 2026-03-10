import { Page } from '@playwright/test';

import { BasePanel } from './BasePanel';

export class DetailsPanel extends BasePanel {
  constructor(page: Page) {
    super(page);
    this.panelName = 'details';
    this.hotkey = 'Alt+6';
  }
}
