import { Page } from '@playwright/test';

import { CreationForm } from './CreationForm';

export class SheetCreationForm extends CreationForm {
  constructor(page: Page) {
    super(page);
    this.nameInput = 'input[placeholder="worksheet name"]';
  }
}
