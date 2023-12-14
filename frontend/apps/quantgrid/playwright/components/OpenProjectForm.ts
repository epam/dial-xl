import { BaseComponent } from './BaseComponent';

export class OpenProjectForm extends BaseComponent {
  private projectsList = 'div.ant-modal-body';

  private;

  public async selectProject(projectName: string) {
    await this.innerPage
      .locator(this.projectsList)
      .getByText(projectName)
      .click();
  }
}
