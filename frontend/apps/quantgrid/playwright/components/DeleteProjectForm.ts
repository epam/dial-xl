import { BaseComponent } from './BaseComponent';

export class DeleteProjectForm extends BaseComponent {
  public async confirmDelete() {
    await this.innerPage.getByRole('button', { name: 'OK' }).click();
  }
}
