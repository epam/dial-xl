import { Page } from '@playwright/test';

import { ProjectCreationForm } from '../components/ProjectCreationForm';

export class ProjectSelection {
  private addNewProjectElement = 'span[aria-label="folder-add"]';

  private welcomeMessage = 'Welcome to QuantGrid';

  private innerPage: Page;

  constructor(page: Page) {
    this.innerPage = page;
  }

  /* public projectInProjectsTree(projectName: string) {
    return `span[title="${projectName}"]`;
  }*/

  public async addNewProject(projectName: string) {
    if (!(await this.innerPage.getByText(projectName).isVisible())) {
      await this.innerPage.locator(this.addNewProjectElement).click();
      const projectCreationForm = new ProjectCreationForm(this.innerPage);
      await projectCreationForm.fillForm(projectName);

      return true;
    }

    return false;
  }

  public getWelcomeElement() {
    return this.innerPage.getByText(this.welcomeMessage);
  }

  public getProjectInList(projectName: string) {
    return this.innerPage.getByText(projectName, { exact: true });
  }

  public async openProject(projectName: string) {
    await this.getProjectInList(projectName).first().click();
  }
}
