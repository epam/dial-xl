import { Page } from '@playwright/test';

export class BaseComponent {
  protected innerPage: Page;

  constructor(page: Page) {
    this.innerPage = page;
  }
}
