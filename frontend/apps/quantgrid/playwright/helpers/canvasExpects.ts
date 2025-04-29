import { expect } from '@playwright/test';

import { Canvas } from '../components/Canvas';

const interval = 200;
const timeout = 30000;

async function waitForCondition(
  conditionFn: () => boolean | Promise<boolean>,
  pollingInterval: number,
  timeout: number
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await conditionFn()) return true;
    await new Promise((resolve) => setTimeout(resolve, pollingInterval));
  }

  return false;
}

async function checkCondition(conditionFn: () => boolean | Promise<boolean>) {
  const result = await waitForCondition(conditionFn, interval, timeout);
  expect(result).toBeTruthy();
}

export async function expectCellTextToBe(
  canvas: Canvas,
  row: number,
  col: number,
  text: string
) {
  await checkCondition(async () => {
    return (await canvas.getCellTableText(row, col)) === text;
  });
}

export async function expectCellTextNotToBe(
  canvas: Canvas,
  row: number,
  col: number,
  text: string
) {
  await checkCondition(async () => {
    return (await canvas.getCellTableText(row, col)) !== text;
  });
}

export async function expectCellTextToBePresent(
  canvas: Canvas,
  row: number,
  col: number
) {
  await checkCondition(async () => {
    const text = await canvas.getCellTableText(row, col);

    return text && text.length > 0;
  });
}
