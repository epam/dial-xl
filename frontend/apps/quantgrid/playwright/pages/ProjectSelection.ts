import { expect, Locator, Page } from '@playwright/test';

import { DeleteProjectForm } from '../components/DeleteProjectForm';
import { FolderCreationForm } from '../components/FolderCreationForm';
import { ProjectCreationForm } from '../components/ProjectCreationForm';

export class ProjectSelection {
  private addNewElement = 'New';

  private addNewProjectElement = 'New project';

  private addNewFolderElement = 'New folder';

  private showAllProjects = 'a#home';

  private welcomeMessage = 'Recent';

  private projectInList = 'span.text-textPrimary';

  private cleanMask = '[data-file-name]';

  private dropdownPart = 'span.ant-dropdown-trigger';

  private dropdownMenuButton = `div[data-file-name] ${this.dropdownPart}`;

  private deleteMenuItem = "li[data-menu-id*='delete']";

  private innerPage: Page;

  constructor(page: Page) {
    this.innerPage = page;
  }

  private itemLocator(projectName: string) {
    return `span[title="${projectName}"]`;
  }

  private getFolderLocator(folderName: string) {
    return `[data-file-name='${folderName}']`;
  }

  private getFileLocator(fileName: string) {
    return this.getFolderLocator(fileName + '.qg');
  }

  private cleanMaskWithException(exceptionItem: string) {
    return `[data-file-name]:not([data-file-name='${exceptionItem}'])`;
  }

  private currentFolderMatchLocator(folderName: string) {
    return `span.text-textPrimary>[title='${folderName}']`;
  }

  private treeStructureElementLocator(itemName: string) {
    return `div.items-center>span>span[title='${itemName}']`;
  }

  private getFolderMenuLocator(folderName: string) {
    return `${this.getFolderLocator(folderName)} ${this.dropdownPart}`;
  }

  private getFileMenuLocator(fileName: string) {
    return `${this.getFileLocator(fileName)} ${this.dropdownPart}`;
  }

  public async createFolder(folderName: string) {
    await this.innerPage.getByText(this.addNewElement).first().click();
    await this.innerPage
      .getByText(this.addNewFolderElement, { exact: true })
      .click();
    const folderCreationForm = new FolderCreationForm(this.innerPage);
    await folderCreationForm.fillForm(folderName);
    await expect(
      this.innerPage.locator(this.getFolderLocator(folderName))
    ).toBeVisible();
  }

  public async isFolderPresent(folderName: string) {
    return this.innerPage
      .locator(this.getFolderLocator(folderName))
      .isVisible();
  }

  public async openFolder(folderName: string) {
    await this.getProjectInList(folderName).click();
    await expect(
      this.innerPage.locator(this.currentFolderMatchLocator(folderName)).nth(1)
    ).toBeVisible();
  }

  public async openFolders(folders: string[]) {
    for (const nameIt of folders) {
      if (
        nameIt !== '' &&
        (await this.innerPage
          .locator(this.treeStructureElementLocator(nameIt))
          .count()) === 0
      ) {
        await this.openFolder(nameIt);
      }
    }
  }

  public async addNewProject(projectName: string, folderName = ['']) {
    await this.switchToAllProjects();
    await this.openFolders(folderName);
    if (!(await this.getProjectInList(projectName).isVisible())) {
      await this.innerPage.getByText(this.addNewElement).first().click();
      await this.innerPage.getByText(this.addNewProjectElement).click();
      const projectCreationForm = new ProjectCreationForm(this.innerPage);
      await projectCreationForm.fillForm(projectName);
      await expect(this.getProjectInList(projectName)).toBeVisible();

      return true;
    }

    return false;
  }

  public async deleteAllAutotestsProjects(folderName = '') {
    if (folderName !== '') {
      await this.getProjectInList(folderName).click();
    }
    const deleteProjectLocator = this.innerPage.locator(this.cleanMask).first();
    await expect(deleteProjectLocator).toBeVisible();
    while (
      (await deleteProjectLocator.isVisible()) &&
      (folderName === '' ||
        (await this.innerPage.locator(this.itemLocator(folderName)).count()) >
          0)
    ) {
      const deletingItem = await deleteProjectLocator.getAttribute(
        'data-file-name'
      );
      if (deletingItem) {
        await this.deleteProject(deleteProjectLocator);
        await expect(
          this.innerPage.locator(this.getFolderLocator(deletingItem))
        ).toBeHidden();
      }
    }
  }

  public async cleanEverythingExceptCurrent(currentFolder: string) {
    await expect(
      this.innerPage
        .locator(this.cleanMask)
        .first()
        .or(this.innerPage.getByText('No items found'))
    ).toBeVisible();
    const deleteProjectLocator = this.innerPage
      .locator(this.cleanMaskWithException(currentFolder))
      .first();
    while (await deleteProjectLocator.isVisible()) {
      const deletingItem = await deleteProjectLocator.getAttribute(
        'data-file-name'
      );
      if (deletingItem) {
        await this.deleteProject(deleteProjectLocator);
        await expect(
          this.innerPage.locator(this.getFolderLocator(deletingItem))
        ).toBeHidden();
      }
    }
  }

  public async deleteProject(projectElement: Locator) {
    await projectElement.first().hover();
    await projectElement.locator(this.dropdownPart).first().click();
    await this.innerPage.locator(this.deleteMenuItem).click();
    const deleteForm = new DeleteProjectForm(this.innerPage);
    await deleteForm.confirmDelete();
  }

  public async deleteFile(fileName: string) {
    await this.innerPage
      .locator(this.getFileLocator(fileName))
      .click({ button: 'right' });
    //  await this.innerPage.locator(this.getFileMenuLocator(fileName)).click();
    await this.innerPage.locator(this.deleteMenuItem).click();
    const deleteForm = new DeleteProjectForm(this.innerPage);
    await deleteForm.confirmDelete();
    await expect(
      this.innerPage.locator(this.getFileLocator(fileName))
    ).toBeHidden();
  }

  public async deleteFolder(folderNames: string[]) {
    for (let i = 0; i < folderNames.length - 1; i++) {
      if (
        folderNames[i] !== '' &&
        (await this.innerPage
          .locator(this.treeStructureElementLocator(folderNames[i]))
          .count()) === 0
      ) {
        await this.getProjectInList(folderNames[i]).click();
      }
    }
    const folderName = folderNames[folderNames.length - 1];
    await this.innerPage.locator(this.getFolderLocator(folderName)).hover();
    await this.innerPage.locator(this.getFolderMenuLocator(folderName)).click();
    await this.innerPage.locator(this.deleteMenuItem).click();
    const deleteForm = new DeleteProjectForm(this.innerPage);
    await deleteForm.confirmDelete();
    await expect(
      this.innerPage.locator(this.getFolderLocator(folderName))
    ).toBeHidden();
  }

  public getWelcomeElement() {
    return this.innerPage.getByText(this.welcomeMessage);
  }

  public getProjectInList(projectName: string) {
    return this.innerPage.locator(this.itemLocator(projectName));
    /* return this.innerPage
      .locator(this.projectInList)
      .and(this.innerPage.getByText(projectName, { exact: true }));*/
  }

  public async switchToAllProjects() {
    if (
      !(
        await this.innerPage.locator(this.showAllProjects).getAttribute('class')
      )?.includes('border-b-2')
    ) {
      await this.innerPage.locator(this.showAllProjects).click();
    }
  }

  public async openProject(projectName: string, folderName = ['']) {
    await this.switchToAllProjects();
    for (const name of folderName) {
      if (
        name !== '' &&
        (await this.innerPage
          .locator(this.treeStructureElementLocator(name))
          .count()) === 0
      ) {
        await this.getProjectInList(name).click();
      }
    }
    await this.getProjectInList(projectName).first().click();
  }
}
