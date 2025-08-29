import { expect, Page } from '@playwright/test';

import { FieldMenuItem } from '../enums/FieldMenuItem';
import { GridMenuItem } from '../enums/GridMenuItem';
import { MoveDirection } from '../enums/MoveDirection';
import { Table } from '../logic-entities/Table';
import { WorkArea } from './abstractions/WorkArea';
import { BaseComponent } from './BaseComponent';
import { Editor } from './Editor';

export class Grid extends BaseComponent implements WorkArea {
  private gridHorizontalCellsHeaders = 'div.grid-header-cell__content';

  private gridHorizontalCellHeaderPlaceholder =
    'div.grid-cell--header-placeholder';

  private gridVerticalCellsHeaders = 'div.grid-row-number';

  private gridHorizontalHeaders = 'div.grid-header';

  private gridData = 'div.grid-data-container';

  private gridScroller = 'div.grid-data-scroller';

  private gridSelection = 'div.grid-selection';

  private selectedColumn = 'div.grid-header-cell--selected';

  private selectedRow = 'div.grid-row-number--selected';

  private tableHeader =
    '[class*="tableRenderer_header"]>div.tableRenderer_headerTitle';

  private tableFieldValue = '[class*="tableRenderer_content_"]';

  private keyField = '[class*="keyField"]';

  private fieldHeader = '[class*="tableRenderer_field"]';

  private removeDim = '.remove-dim-button';

  private gridCellEditor: Editor; //='.grid-cell-editor';

  private gridCellEditorRootLocator = '[data-mode-id="cell-editor"]';

  private moveSelection = '.grid-selection__move';

  private moveSelectionTooltip = '.grid-selection-move-tooltip';

  private contextMenu = '.grid-context-menu';

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

  public gridCellRoot(row: number, column: number) {
    return `div.grid-cell:has(>${this.gridCell(row, column)})`;
  }

  private gridCellTableContent(row: number, column: number) {
    return `${this.gridCell(row, column)}${this.tableFieldValue}`;
  }

  private gridKeyFieldCell(row: number, column: number) {
    return `${this.gridCell(row, column)}${this.keyField}`;
  }

  private gridFieldHeaderCell(row: number, column: number) {
    return `${this.gridCell(row, column)}${this.fieldHeader}`;
  }

  private gridCellDimension(row: number, column: number) {
    return `${this.removeDim}${this.keyGridLocator(row, column)}`;
  }

  private collapsedDimension(row: number, column: number) {
    return `${this.gridCell(row, column)}>button.show-dim-table`;
  }

  private gridCellTableHeader(row: number, column: number) {
    return `${this.gridCell(row, column)}${this.tableHeader}`;
  }

  private gridCellTableMenu(row: number, column: number) {
    return `button.context-menu-button${this.keyGridLocator(row, column)}`;
  }

  public async getCellTableText(row: number, column: number) {
    return (
      (await this.innerPage
        .locator(this.gridCellTableContent(row, column))
        .textContent()) || ''
    );
  }

  public getCellEditor() {
    return this.gridCellEditor;
  }

  public async clickOnCell(row: number, column: number) {
    await this.innerPage.locator(this.gridCell(row, column)).first().click();
  }

  public async dbClickOnCell(row: number, column: number) {
    await this.innerPage.locator(this.gridCell(row, column)).first().dblclick();
  }

  public async dragFromCellToCell(
    rowStart: number,
    columnStrart: number,
    rowEnd: number,
    columnEnd: number
  ) {
    await this.innerPage
      .locator(this.gridCell(rowStart, columnStrart))
      .first()
      .dragTo(this.innerPage.locator(this.gridCell(rowEnd, columnEnd)).first());
  }

  public async expectSelectedRowToBe(row: number) {
    await expect(this.innerPage.locator(this.selectedRow).first()).toHaveText(
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
    await this.innerPage
      .locator(this.gridCellTableContent(row, column))
      .click({ button: 'right' });
    await expect(
      this.innerPage.getByText(FieldMenuItem.RemoveDimension, { exact: true })
    ).toBeVisible();
  }

  public async expectFieldIsNotDimension(row: number, column: number) {
    await this.innerPage
      .locator(this.gridCellTableContent(row, column))
      .click({ button: 'right' });
    await expect(
      this.innerPage.getByText(FieldMenuItem.MakeDimension, { exact: true })
    ).toBeVisible();
  }

  public async expectSelectedColumnToBe(column: number) {
    await expect(
      this.innerPage.locator(this.selectedColumn).first()
    ).toHaveText(column.toString());
  }

  public async scrollDown() {
    await this.innerPage
      .locator(this.gridScroller)
      .evaluate((e) => (e.scrollTop = e.scrollHeight));
  }

  public async verifyGridDimensionsEqualsTo(
    expectedRows: number,
    expectedColumns: number
  ) {
    await expect(
      this.innerPage.locator(this.gridHorizontalCellHeaderPlaceholder)
    ).toHaveCount(expectedColumns);

    await this.clickOnCell(1, 1);
    await this.innerPage.keyboard.press('Control+ArrowDown');
    await expect(
      this.innerPage.locator(this.gridVerticalCellsHeaders).last()
    ).toContainText((expectedRows + 1).toString());
  }

  public async performMenuAction(
    row: number,
    column: number,
    actionText: string
  ) {
    await this.innerPage.locator(this.gridCellTableHeader(row, column)).hover();
    await this.innerPage.locator(this.gridCellTableMenu(row, column)).click();
    await this.innerPage.getByText(actionText, { exact: true }).click();
  }

  public async waitForComponentLoaded() {
    await expect(
      this.innerPage.locator(this.gridHorizontalHeaders)
    ).toBeVisible();
    await expect(this.innerPage.locator(this.gridData)).toBeVisible();
  }

  public async isVisible() {
    return await this.innerPage.locator(this.gridData).isVisible();
  }

  public async expectCellBecameEditable(cellText: string | undefined) {
    await this.gridCellEditor.shouldBeVisible();
    if (cellText)
      await expect(this.gridCellEditor.getValueLocator()).toHaveText(cellText);
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

  public async performCellSubAction(
    row: number,
    column: number,
    groupText: string,
    actionText: string
  ) {
    await this.innerPage
      .locator(this.gridCellTableContent(row, column))
      .click({ button: 'right' });
    await this.innerPage.getByText(groupText, { exact: true }).hover();
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
    await this.innerPage.keyboard.press('Enter');
  }

  public async setCellValueAndCancel(newValue: string) {
    await this.gridCellEditor.setValueAndCancel(newValue, false);
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

  public async expectCellToBeDim(row: number, column: number) {
    await expect(
      this.innerPage.locator(this.gridCellTableContent(row, column))
    ).toBeVisible();
    await expect(
      this.innerPage.locator(this.collapsedDimension(row, column))
    ).toBeVisible();
  }

  public async expectCellToNotBeDim(row: number, column: number) {
    await expect(
      this.innerPage.locator(this.collapsedDimension(row, column))
    ).toBeHidden();
  }

  public async expectTableHeaderToAppear(row: number, column: number) {
    await expect(
      this.innerPage.locator(this.gridCellTableHeader(row, column))
    ).toBeVisible();
  }

  public async expectFieldHeaderToAppear(row: number, column: number) {
    await expect(
      this.innerPage.locator(this.gridFieldHeaderCell(row, column))
    ).toBeVisible();
  }

  public async expectMoveSelectionToBeVisible() {
    await expect(this.innerPage.locator(this.moveSelection)).toBeVisible();
  }

  public async moveTable(table: Table, direction: MoveDirection) {
    await this.performMenuAction(
      table.getTop(),
      table.getLeft(),
      GridMenuItem.Move
    );
    await this.expectMoveSelectionToBeVisible();
    await this.moveCurrentTable(direction);
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

  public async expectContextMenuVisible() {
    await expect(this.innerPage.locator(this.contextMenu)).toBeVisible();
  }
}
