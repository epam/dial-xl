/* eslint-disable no-console */
import { expect, Page } from '@playwright/test';

import { MenuType } from '../enums/MenuType';
import { MoveDirection } from '../enums/MoveDirection';
import {
  getCellCoordinates,
  getCellDisplayValue,
  getCellText,
} from '../helpers/canvasGridApiUtil';
import { Table } from '../logic-entities/Table';
import { WorkArea } from './abstractions/WorkArea';
import { BaseComponent } from './BaseComponent';
import { Editor } from './Editor';

export class Canvas extends BaseComponent implements WorkArea {
  private canvasCellEditor: Editor;

  private canvasCellEditorRootLocator = '[data-mode-id="cell-editor"]';

  private rootLocator = '#canvas-spreadsheet';

  constructor(page: Page) {
    super(page);
    this.canvasCellEditor = new Editor(
      page,
      page.locator(this.canvasCellEditorRootLocator),
    );
  }

  public async getCellTableText(row: number, column: number) {
    return await getCellText(this.innerPage, { col: column, row: row });
  }

  public async getCellDisplayValue(row: number, column: number) {
    return await getCellDisplayValue(this.innerPage, { col: column, row: row });
  }

  public async clickOnCell(row: number, column: number) {
    const coords = await getCellCoordinates(this.innerPage, {
      col: column,
      row: row,
    });
    console.log(coords);
    await this.innerPage.locator(this.rootLocator).click({ position: coords });
    //await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public getCellEditor() {
    return this.canvasCellEditor;
  }

  public async expectVisualizationToAppear(row: number, column: number) {
    await getCellText(this.innerPage, { col: column, row: row });
  }
  public async dbClickOnCell(row: number, column: number) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async dragFromCellToCell(
    rowStart: number,
    columnStrart: number,
    rowEnd: number,
    columnEnd: number,
  ) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectSelectedRowToBe(row: number) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectFieldToBeKey(row: number, column: number) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectFieldNotBeKey(row: number, column: number) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectFieldIsDimension(row: number, column: number) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectFieldIsNotDimension(row: number, column: number) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectSelectedColumnToBe(column: number) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async scrollDown() {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async verifyGridDimensionsEqualsTo(
    expectedRows: number,
    expectedColumns: number,
  ) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async performMenuAction(
    row: number,
    column: number,
    actionText: string,
  ) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async waitForComponentLoaded() {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }

  public async isVisible() {
    return await this.innerPage.locator(this.rootLocator).isVisible();
  }

  public async expectCellBecameEditable(cellText: string | undefined) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async performCellAction(
    row: number,
    column: number,
    menuType: MenuType,
    actionText: string,
  ) {
    const coords = await getCellCoordinates(this.innerPage, {
      col: column,
      row: row,
    });
    await this.innerPage
      .locator(this.rootLocator)
      .click({ position: coords, button: 'right' });
    const dataQa = `${menuType}-${actionText}`;
    await this.innerPage.locator(`[data-qa="${dataQa}"]`).click();
  }
  public async performCellSubAction(
    row: number,
    column: number,
    menuType: MenuType,
    groupText: string,
    actionText: string,
  ) {
    const dataQa = `${menuType}-${groupText}-${actionText}`;
    const subItem = this.innerPage.locator(`[data-qa="${dataQa}"]`);
    let retries = 0;
    let successfull = false;
    do {
      try {
        do {
          await this.hoverCellMenuAction(row, column, menuType, groupText);
          await expect(subItem).toBeVisible();
        } while (!(await subItem.boundingBox()) && retries++ < 5);
        await subItem.click();
        successfull = true;
      } catch (error) {
        console.log(
          `Error performing cell sub action '${actionText}': ${error}`,
        );
      }
    } while (!successfull && retries++ < 5);
  }

  public async hoverCellMenuAction(
    row: number,
    column: number,
    menuType: MenuType,
    groupText: string,
  ) {
    const coords = await getCellCoordinates(this.innerPage, {
      col: column,
      row: row,
    });
    await this.innerPage
      .locator(this.rootLocator)
      .click({ position: coords, button: 'right' });
    const dataQa = `${menuType}-${groupText}`;
    const item = this.innerPage.locator(`[data-qa="${dataQa}"]`);
    await expect(item).toBeVisible();
    const box = await item.boundingBox();
    await item.hover();
  }

  public async performMenuSubAction(
    row: number,
    column: number,
    groupText: string,
    actionText: string,
  ) {
    // This method is used for table header menus
    await this.performCellSubAction(
      row,
      column,
      MenuType.TableHeader,
      groupText,
      actionText,
    );
  }

  public async expectCellTextChange(
    row: number,
    column: number,
    newCellText: string,
  ) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async setCellValue(newValue: string) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async setCellValueAndCancel(newValue: string) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectTableToDissapear(row: number, column: number) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectTableToAppear(row: number, column: number) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectTableHeaderToDissapear(row: number, column: number) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectCellToBeDim(row: number, column: number) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectCellToNotBeDim(row: number, column: number) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectTableHeaderToAppear(row: number, column: number) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectFieldHeaderToAppear(row: number, column: number) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectMoveSelectionToBeVisible() {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async moveTable(table: Table, direction: MoveDirection) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async moveCurrentTable(direction: MoveDirection) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async verifyTableMove(
    initialRow: number,
    initialColumn: number,
    text: string,
    direction: MoveDirection,
  ) {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
  public async expectContextMenuVisible() {
    await this.innerPage.locator(this.rootLocator).getAttribute('class');
  }
}
