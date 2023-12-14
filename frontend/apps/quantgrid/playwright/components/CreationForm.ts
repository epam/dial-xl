import { BaseComponent } from './BaseComponent';

export abstract class CreationForm extends BaseComponent {
  protected nameInput: string;

  public async fillForm(projectName: string) {
    await this.innerPage.locator(this.nameInput).fill(projectName);
    await this.innerPage.getByText('OK').click();
  }
}
