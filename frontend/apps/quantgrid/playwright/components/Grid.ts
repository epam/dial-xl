import { expect, Page } from '@playwright/test';

import { MoveDirection } from '../enums/MoveDirection';
import { BaseComponent } from './BaseComponent';
import { Editor } from './Editor';

export class Grid extends BaseComponent {
  private gridHorizontalCellsHeaders = 'div.grid-header-cell__content';

  private gridVerticalCellsHeaders = 'div.grid-row-number';

  private gridHorizontalHeaders = 'div.grid-header';

  private gridData = 'div.grid-data-container';

  private gridScroller = 'div.grid-data-scroller';

  private gridSelection = 'div.grid-selection';

  private selectedColumn = 'div.grid-header-cell--selected';

  private selectedRow = 'div.grid-row-number--selected';

  private tableHeader = '[class*="tableRenderer_header"]>div';

  private tableFieldValue = '[class*="tableRenderer_content"]';

  private keyField = '[class*="keyField"]';

  private removeDim = '.remove-dim-button';

  private gridCellEditor: Editor; //='.grid-cell-editor';

  private gridCellEditorRootLocator = '[data-mode-id="cell-editor"]';

  private moveSelection = '.grid-selection__move';

  private moveSelectionTooltip = '.grid-selection-move-tooltip';

  private renameTableText = 'Rename table';

  private deleteTableText = 'Delete table';

  private moveTable = 'Move table';

  private createDerivedTable = 'Create derived table';

  constructor(page: Page) {
    super(page);
    this.gridCellEditor = new Editor(
      page,
      page.locator(this.gridCellEditorRootLocator)
    );
  }

  private keyGridLocator(row: number, column: number) {
    return `[data-row='${row}'][data-col='${column}']`;
  }
  private gridCell(row: number, column: number) {
    return `div${this.keyGridLocator(row, column)}`;
  }

  private gridCellTableContent(row: number, column: number) {
    return `${this.gridCell(row, column)}${this.tableFieldValue}`;
  }

  private gridKeyFieldCell(row: number, column: number) {
    return `${this.gridCell(row, column)}${this.keyField}`;
  }

  private gridCellDimension(row: number, column: number) {
    return `${this.removeDim}${this.keyGridLocator(row, column)}`;
  }

  private gridCellTableHeader(row: number, column: number) {
    return `${this.gridCell(row, column)}${this.tableHeader}`;
  }

  private gridCellTableMenu(row: number, column: number) {
    return `button.context-menu-button${this.keyGridLocator(row, column)}`;
  }

  public getCellTableText(row: number, column: number) {
    return this.innerPage.locator(this.gridCellTableContent(row, column));
  }

  public async clickOnCell(row: number, column: number) {
    await this.innerPage.locator(this.gridCell(row, column)).first().click();
  }

  public async expectSelectedRowToBe(row: number) {
    await expect(this.innerPage.locator(this.selectedRow)).toHaveText(
      row.toString()
    );
  }

  public async expectFieldToBeKey(row: number, column: number) {
    await expect(
      this.innerPage.locator(this.gridKeyFieldCell(row, column))
    ).toBeVisible();
  }

  public async expectFieldNotBeKey(row: number, column: number) {
    await expect(
      this.innerPage.locator(this.gridKeyFieldCell(row, column))
    ).toBeHidden();
  }

  public async expectFieldIsDimension(row: number, column: number) {
    await expect(
      this.innerPage.locator(this.gridCellDimension(row, column))
    ).toBeVisible();
  }

  public async expectFieldIsNotDimension(row: number, column: number) {
    await expect(
      this.innerPage.locator(this.gridCellDimension(row, column))
    ).toBeHidden();
  }

  public async expectSelectedColumnToBe(column: number) {
    await expect(this.innerPage.locator(this.selectedColumn)).toHaveText(
      column.toString()
    );
  }

  public async verifyGridDimensionsEqualsTo(
    expectedRows: number,
    expectedColumns: number
  ) {
    await expect(
      this.innerPage.locator(this.gridHorizontalCellsHeaders)
    ).toHaveCount(expectedColumns);
    await this.innerPage
      .locator(this.gridScroller)
      .evaluate((e) => (e.scrollTop = e.scrollHeight));
    await expect(
      this.innerPage.locator(this.gridVerticalCellsHeaders).last()
    ).toContainText((expectedRows + 1).toString());
  }

  public async performMenuAction(
    row: number,
    column: number,
    actionText: string
  ) {
    await this.innerPage.locator(this.gridCellTableMenu(row, column)).click();
    await this.innerPage.getByText(actionText, { exact: true }).click();
  }

  public async waitGridVisible() {
    await expect(
      this.innerPage.locator(this.gridHorizontalHeaders)
    ).toBeVisible();
    await expect(this.innerPage.locator(this.gridData)).toBeVisible();
  }

  public async expectCellBecameEditable(cellText: string) {
    await this.gridCellEditor.shouldBeVisible();
    await expect(this.gridCellEditor.getValueLocator()).toHaveText(cellText);
    //await expect(this.innerPage.locator(this.gridCellEditor)).toBeVisible();
    // await expect(this.innerPage.locator(this.gridCellEditor)).toHaveText(
    //   cellText
    // );
  }

  public async performCellAction(
    row: number,
    column: number,
    actionText: string
  ) {
    await this.innerPage
      .locator(this.gridCellTableContent(row, column))
      .click({ button: 'right' });
    await this.innerPage.getByText(actionText, { exact: true }).click();
  }

  public async expectCellTextChange(
    row: number,
    column: number,
    newCellText: string
  ) {
    await expect(
      this.innerPage.locator(this.gridCellTableContent(row, column))
    ).toHaveText(newCellText);
  }

  public async setCellValue(newValue: string) {
    const oldLength =
      (await this.gridCellEditor.getValueLocator().textContent())?.length || 0;
    await this.gridCellEditor.setValue(newValue, oldLength, false);
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.innerPage.keyboard.press('Enter');
    //await this.innerPage.locator(this.gridCellEditor).fill(newValue);
    // await this.innerPage.locator(this.gridCellEditor).press('Enter');
  }

  public async setCellValueAndCancel(newValue: string) {
    await this.gridCellEditor.setValueAndCancel(newValue, false);
    /*  await this.innerPage.locator(this.gridCellEditor).clear();
    await this.innerPage.locator(this.gridCellEditor).type(newValue);
    await this.innerPage.locator(this.gridCellEditor).press('Escape');*/
  }

  public async expectTableToDissapear(row: number, column: number) {
    await expect(
      this.innerPage.locator(this.gridCellTableContent(row, column))
    ).toBeHidden();
  }

  public async expectTableToAppear(row: number, column: number) {
    await expect(
      this.innerPage.locator(this.gridCellTableContent(row, column))
    ).toBeVisible();
  }

  public async expectTableHeaderToDissapear(row: number, column: number) {
    await expect(
      this.innerPage.locator(this.gridCellTableHeader(row, column))
    ).toBeHidden();
  }

  public async expectTableHeaderToAppear(row: number, column: number) {
    await expect(
      this.innerPage.locator(this.gridCellTableHeader(row, column))
    ).toBeVisible();
  }

  public async expectMoveSelectionToBeVisible() {
    await expect(this.innerPage.locator(this.moveSelection)).toBeVisible();
  }

  public async moveCurrentTable(direction: MoveDirection) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    switch (direction) {
      case MoveDirection.UP:
        await this.innerPage.keyboard.press('ArrowUp');
        break;
      case MoveDirection.DOWN:
        await this.innerPage.keyboard.press('ArrowDown');
        break;
      case MoveDirection.LEFT:
        await this.innerPage.keyboard.press('ArrowLeft');
        break;
      case MoveDirection.RIGHT:
        await this.innerPage.keyboard.press('ArrowRight');
        break;
    }
    await this.innerPage.keyboard.press('Enter');
  }

  public async verifyTableMove(
    initialRow: number,
    initialColumn: number,
    text: string,
    direction: MoveDirection
  ) {
    await expect(
      this.innerPage.locator(
        this.gridCellTableHeader(initialRow, initialColumn)
      )
    ).toBeHidden();
    let newRow = initialRow,
      newColumn = initialColumn;
    switch (direction) {
      case MoveDirection.UP:
        newRow--;
        break;
      case MoveDirection.DOWN:
        newRow++;
        break;
      case MoveDirection.LEFT:
        newColumn--;
        break;
      case MoveDirection.RIGHT:
        newColumn++;
        break;
    }
    await expect(
      this.innerPage.locator(this.gridCellTableHeader(newRow, newColumn))
    ).toHaveText(text);
  }
}
