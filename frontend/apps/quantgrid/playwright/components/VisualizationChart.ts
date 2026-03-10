import { expect, Page } from '@playwright/test';

import { getCellX } from '../helpers/canvasGridApiUtil';

export class ToolTipItem {
  name: string;
  value: number;

  constructor(name: string, value: number) {
    this.name = name;
    this.value = value;
  }
}

export class VisualizationChart {
  private page: Page;

  private rootElem = 'div.echarts-for-react';

  private canvas = `${this.rootElem} canvas`;

  private canvasToolTip = `${this.rootElem}>div:nth-child(2)`;

  private legendIndent = 0;

  private intervalStep = 0;

  constructor(page: Page) {
    this.page = page;
  }

  public async shouldBeVisible() {
    await expect(this.page.locator(this.canvas)).toBeVisible();
  }

  public async initializeNumbers(intervalsCount: number) {
    this.legendIndent =
      ((await getCellX(this.page, 2)) - (await getCellX(this.page, 1))) * 2;
    const totalWidth =
      (await this.page.locator(this.canvas).boundingBox())?.width || 0;
    this.intervalStep = (totalWidth - this.legendIndent) / intervalsCount;
  }

  public async verifyAxes(axesNames: string[]) {
    axesNames.forEach(
      async (axe) =>
        await expect(this.page.locator(this.rootElem)).toHaveText(axe),
    );
  }

  public async verifyProperties(propertiesNames: string[]) {
    propertiesNames.forEach(
      async (property) =>
        await expect(this.page.locator(this.rootElem)).toHaveText(property),
    );
  }

  public async pointToInterval(intervalNum: number) {
    const chartHeight =
      (await this.page.locator(this.canvas).boundingBox())?.height || 0;
    await this.page.locator(this.canvas).hover({
      position: {
        x: this.legendIndent + intervalNum * this.intervalStep,
        y: chartHeight,
      },
    });
  }

  public async assertIntervalValues(expectedValues: ToolTipItem[]) {
    for (const { name, value } of expectedValues) {
      await expect(this.page.locator(this.canvasToolTip)).toContainText(name);
      await expect(this.page.locator(this.canvasToolTip)).toContainText(
        String(value),
      );
    }
  }

  public async delete() {
    await this.page.locator(this.canvas).click();
    await this.page.keyboard.press('Delete');
  }
}
