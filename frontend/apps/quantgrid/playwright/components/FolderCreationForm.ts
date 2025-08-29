import { Page } from '@playwright/test';

import { CreationForm } from './CreationForm';

export class FolderCreationForm extends CreationForm {
  constructor(page: Page) {
    super(page);
    this.nameInput = 'input[placeholder="Folder name"]';
  }
}
