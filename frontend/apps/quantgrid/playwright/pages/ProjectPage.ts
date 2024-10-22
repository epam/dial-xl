import { expect, Page } from '@playwright/test';

import { Editor } from '../components/Editor';
import { EditorPanel } from '../components/EditorPanel';
import { ErrorsPanel } from '../components/ErrorsPanel';
import { Grid } from '../components/Grid';
import { HistoryPanel } from '../components/HistoryPanel';
import { InputsPanel } from '../components/InputsPanel';
import { ProjectTree } from '../components/ProjectTree';
import { TopMenu } from '../components/TopMenu';
import { Panels } from '../enums/Panels';

export class ProjectPage {
  // private dslEditors = 'div[data-mode-id="quant-dsl"]>div';

  private codeEditor = 'div[data-mode-id="code-editor"]>div';

  private editorText = 'Editor';

  private monacoEditor = 'div.monaco-editor';

  private formulaValue =
    'div[data-mode-id="formula-bar"] .view-lines>.view-line';

  private projectInProjectsTree = (projectName: string) =>
    `span[title="${projectName}"]`;

  private projectTitle = '#projectNameTitle';

  private formulaMenu = ".formula-bar-menu [role='img']";

  private formulaEditorLocator =
    '[data-mode-id="formula-bar"]>div.monaco-editor';

  private innerPage: Page;

  //  private dslEditor: Editor;

  private formulaBar: Editor;

  private grid: Grid;

  private menu: TopMenu;

  private projectTree: ProjectTree;

  private inputs: InputsPanel;

  private editor: EditorPanel;

  private history: HistoryPanel;

  private errors: ErrorsPanel;

  public getGrid() {
    return this.grid;
  }

  public getEditor() {
    return this.editor.getEditor();
  }

  public getFormulaEditor() {
    return this.formulaBar;
  }

  constructor(page: Page) {
    this.innerPage = page;
  }

  public getPlaywrightPage() {
    return this.innerPage;
  }

  public static async createInstance(page: Page) {
    const projectPage = new ProjectPage(page);
    await projectPage.openEditor();
    projectPage.formulaBar = new Editor(
      page,
      page.locator(projectPage.formulaEditorLocator)
    );
    projectPage.grid = new Grid(page);
    projectPage.menu = new TopMenu(page);
    projectPage.projectTree = new ProjectTree(page);
    projectPage.inputs = new InputsPanel(page);
    projectPage.errors = new ErrorsPanel(page);
    projectPage.history = new HistoryPanel(page);
    projectPage.editor = new EditorPanel(page);

    return projectPage;
  }

  public static async createCleanInstance(page: Page) {
    const projectPage = new ProjectPage(page);
    projectPage.formulaBar = new Editor(
      page,
      page.locator(projectPage.formulaEditorLocator)
    );
    projectPage.grid = new Grid(page);
    projectPage.menu = new TopMenu(page);
    projectPage.projectTree = new ProjectTree(page);
    projectPage.inputs = new InputsPanel(page);
    projectPage.errors = new ErrorsPanel(page);
    projectPage.history = new HistoryPanel(page);
    projectPage.editor = new EditorPanel(page);
    await projectPage.grid.waitGridVisible();

    return projectPage;
  }

  public async openEditor() {
    let visible = false,
      i = 0;
    const retries = 20,
      interval = 200;
    while (i < retries && !visible) {
      visible = await this.innerPage.locator(this.codeEditor).isVisible();
      await new Promise((resolve) => setTimeout(resolve, interval));
      i++;
    }
    if (!visible) {
      await this.innerPage.getByText(this.editorText, { exact: true }).click();
    }
  }

  public addDSL = async (dsl: string) => await this.getEditor().applyDSL(dsl);

  public getFormula() {
    return this.innerPage.locator(this.formulaValue);
  }

  public sendKeysFormulaValue = async (formula: string) =>
    await this.formulaBar.setValueWithoutClean(formula);

  public async setFormula(formula: string, count: number) {
    await this.formulaBar.setValue(formula, count);
  }

  public async cancelFormulaChange(formula: string) {
    await this.formulaBar.setValueAndCancel(formula);
  }

  public async typeInFormulaBar(formula: string) {
    await this.formulaBar.typeValue(formula);
  }

  public async;

  public getCellText = (row: number, column: number) =>
    this.grid.getCellTableText(row, column);

  public async projectShouldBeInProjectsTree(projectName: string) {
    await expect(this.projectTree.getTreeNode(projectName)).toBeVisible();
  }

  public async projectShouldNotBeInProjectsTree(projectName: string) {
    await expect(this.projectTree.getTreeNode(projectName)).toBeHidden();
  }

  public async clickOnItemInProjectsTree(projectName: string) {
    await this.projectTree.getTreeNode(projectName).click();
  }

  public titleShouldContainProjectName = async (projectName: string) =>
    await expect(
      this.innerPage.locator(this.projectTitle).first()
    ).toContainText(projectName);

  public assertGridDimensions = async (
    expectedRowsCount: number,
    expectedColumnsCount: number
  ) =>
    this.grid.verifyGridDimensionsEqualsTo(
      expectedRowsCount,
      expectedColumnsCount
    );

  public clickOnGridCell = async (row: number, column: number) =>
    this.grid.clickOnCell(row, column);

  public async checkGridSelectionIndexes(row: number, column: number) {
    await this.grid.expectSelectedRowToBe(row);
    await this.grid.expectSelectedColumnToBe(column);
  }

  public async performMenuCommand(menuItem: string, dropdownItem: string) {
    await this.menu.performAction(menuItem, dropdownItem);
  }

  public async performMenuSubCommand(
    menuItem: string,
    hoverItem: string,
    dropdownItem: string
  ) {
    await this.menu.performSubAction(menuItem, hoverItem, dropdownItem);
  }

  public async hideAllPanels() {
    await this.projectTree.closePanel();
    await this.inputs.closePanel();
    await this.editor.closePanel();
    await this.history.closePanel();
    await this.errors.closePanel();
  }

  private getPanelByName(panelName: Panels) {
    switch (panelName) {
      case Panels.ProjectTree:
        return this.projectTree;
      case Panels.EditorPanel:
        return this.editor;
      case Panels.ErrorsPanel:
        return this.errors;
      case Panels.HistoryPanel:
        return this.history;
      case Panels.InputsPanel:
        return this.inputs;
      default:
        return null;
    }
  }

  public async expectPanelToBeVisible(panelName: Panels) {
    await this.getPanelByName(panelName)?.shouldBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  public async expectPanelToBeHidden(panelName: Panels) {
    await this.getPanelByName(panelName)?.shouldBeHidden();
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  public async expectLastHistoryRecord(text: string) {
    const exp = new RegExp(text, 'g');
    await expect(this.history.getHistoryItems().first()).toHaveAttribute(
      'title',
      exp
    );
  }

  public async openFormulasList() {
    await this.innerPage.locator(this.formulaMenu).click();
  }
}
