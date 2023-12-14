import { BaseComponent } from './BaseComponent';

export class DeleteProjectForm extends BaseComponent {
  private confirmButton = 'button.ant-btn-primary>>visible=true';

  public async confirmDelete() {
    await this.innerPage.locator(this.confirmButton).click();
  }
}
