import { Page } from '@playwright/test';

import { CreationForm } from './CreationForm';

export class ProjectCreationForm extends CreationForm {
  constructor(page: Page) {
    super(page);
    this.nameInput = 'input[placeholder="project name"]';
  }
}
