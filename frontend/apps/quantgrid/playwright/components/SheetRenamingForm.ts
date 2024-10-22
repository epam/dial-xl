import { Page } from '@playwright/test';

import { CreationForm } from './CreationForm';

export class SheetRenamingForm extends CreationForm {
  constructor(page: Page) {
    super(page);
    this.nameInput = 'input[placeholder="Sheet name"]';
  }
}
