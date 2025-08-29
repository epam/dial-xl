import { Locator } from '@playwright/test';

import { MoveDirection } from '../../enums/MoveDirection';
import { Table } from '../../logic-entities/Table';
import { Editor } from '../Editor';

export interface WorkArea {
  clickOnCell(row: number, column: number): void;

  getCellEditor(): Editor;

  dbClickOnCell(row: number, column: number): void;

  dragFromCellToCell(
    rowStart: number,
    columnStrart: number,
    rowEnd: number,
    columnEnd: number
  ): void;

  expectSelectedRowToBe(row: number): void;

  expectFieldToBeKey(row: number, column: number): void;

  expectFieldNotBeKey(row: number, column: number): void;

  expectFieldIsDimension(row: number, column: number): void;

  expectFieldIsNotDimension(row: number, column: number): void;

  expectSelectedColumnToBe(column: number): void;

  scrollDown(): void;

  verifyGridDimensionsEqualsTo(
    expectedRows: number,
    expectedColumns: number
  ): void;

  getCellTableText(row: number, column: number): Promise<string>;

  performMenuAction(row: number, column: number, actionText: string): void;

  waitForComponentLoaded(): void;

  isVisible(): Promise<boolean>;

  expectCellBecameEditable(cellText: string | undefined): void;

  performCellAction(row: number, column: number, actionText: string): void;

  performCellSubAction(
    row: number,
    column: number,
    groupText: string,
    actionText: string
  ): void;

  expectCellTextChange(row: number, column: number, newCellText: string): void;

  setCellValue(newValue: string): void;

  setCellValueAndCancel(newValue: string): void;

  expectTableToDissapear(row: number, column: number): void;

  expectTableToAppear(row: number, column: number): void;

  expectTableHeaderToDissapear(row: number, column: number): void;

  expectCellToBeDim(row: number, column: number): void;

  expectCellToNotBeDim(row: number, column: number): void;

  expectTableHeaderToAppear(row: number, column: number): void;

  expectFieldHeaderToAppear(row: number, column: number): void;

  expectMoveSelectionToBeVisible(): void;

  moveTable(table: Table, direction: MoveDirection): void;

  moveCurrentTable(direction: MoveDirection): void;

  verifyTableMove(
    initialRow: number,
    initialColumn: number,
    text: string,
    direction: MoveDirection
  ): void;

  expectContextMenuVisible(): void;
}
