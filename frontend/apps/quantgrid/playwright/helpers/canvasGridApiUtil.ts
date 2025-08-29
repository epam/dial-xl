import { GridApi } from '@frontend/canvas-spreadsheet';
import { Page } from '@playwright/test';

import { CellGridPosition } from './CellGridPosition';
import { MoveViewportToOptions } from './MoveViewportToOptions';
import { RegularSelect } from './RegularSelect';

export interface WindowTestUtils extends Window {
  canvasGridApi: GridApi;
}
declare let window: WindowTestUtils;

export async function waitForCanvasGridApi(page: Page) {
  await page.waitForFunction(() => {
    return !!window.canvasGridApi;
  });
}

/*export async function moveViewportTo(
  page: Page,
  moveViewportToOptions: MoveViewportToOptions
) {
  await waitForCanvasGridApi(page);
  await page.evaluate((moveViewportToOptions) => {
    window.canvasGridApi.moveViewportTo(moveViewportToOptions);
  }, moveViewportToOptions);
}*/

export async function updateRegularSelection(
  page: Page,
  selection: RegularSelect[] | null
) {
  await waitForCanvasGridApi(page);
  await page.evaluate((selection) => {
    window.canvasGridApi.updateSelection(selection);
  }, selection);
}

export async function selectCell(
  page: Page,
  cellCoordinates: CellGridPosition
) {
  await waitForCanvasGridApi(page);
  const selectedRange: RegularSelect = {
    active: true,
    endCol: cellCoordinates.col,
    endRow: cellCoordinates.row,
    startCol: cellCoordinates.col,
    startRow: cellCoordinates.row,
  };
  await updateRegularSelection(page, [selectedRange]);
}

export async function getCellX(page: Page, col: number): Promise<number> {
  return await page.evaluate((col) => {
    return (
      window.canvasGridApi.getCellX(col) - window.canvasGridApi.getCellX(0) + 5
    );
  }, col);
}

export async function getCellY(page: Page, row: number): Promise<number> {
  return await page.evaluate((row) => {
    return (
      window.canvasGridApi.getCellY(row) - window.canvasGridApi.getCellY(0) + 5
    );
  }, row);
}

export async function getCellText(page: Page, position: CellGridPosition) {
  return await page.evaluate((position) => {
    return window.canvasGridApi.getCell(position.col, position.row)?.value;
  }, position);
}

export async function getCellCoordinates(
  page: Page,
  position: CellGridPosition
): Promise<{ x: number; y: number }> {
  await waitForCanvasGridApi(page);
  const x = await getCellX(page, position.col);
  const y = await getCellY(page, position.row);

  return { x, y };
}

/*export async function setShowEditor(page: Page, isShown = true) {
  await waitForCanvasGridApi(page);
  await page.evaluate((isShown) => {
    window.canvasGridApi.showCellEditor(isShown);
  }, isShown);
}*/
