import * as PIXI from 'pixi.js';

import { GridCell } from '@frontend/common';

import { GridSizes } from '../constants';
import { CellStyle, Coordinates, Theme } from '../types';

export function applyCellStyle(
  graphics: PIXI.Graphics,
  style: CellStyle,
  x: number,
  y: number,
  width: number,
  height: number,
  borderLeftXOffset = 0,
  borderBottomYOffset = 0
): void {
  if (style.bgColor) {
    graphics.beginFill(style.bgColor).drawRect(x, y, width, height).endFill();
  }

  if (style.diffColor) {
    graphics
      .beginFill(style.diffColor, 0.1)
      .drawRect(x, y, width, height)
      .endFill();
  }

  if (style.border) {
    const { border } = style;

    if (border?.borderTop) {
      graphics
        .lineStyle({ ...border.borderTop, alignment: 0 })
        .moveTo(x, y)
        .lineTo(x + width, y);
    }

    if (border?.borderRight) {
      graphics
        .lineStyle({ ...border.borderRight, alignment: 0 })
        .moveTo(x + width, y)
        .lineTo(x + width, y + height);
    }

    if (border?.borderLeft) {
      graphics
        .lineStyle({ ...border.borderLeft, alignment: 0 })
        .moveTo(x + borderLeftXOffset, y)
        .lineTo(x + borderLeftXOffset, y + height);
    }

    if (border?.borderBottom) {
      graphics
        .lineStyle({ ...border.borderBottom, alignment: 0 })
        .moveTo(x, y + height - borderBottomYOffset)
        .lineTo(x + width, y + height - borderBottomYOffset);
    }

    graphics.lineStyle({});
  }
}

export function applyCellGraphics(
  graphics: PIXI.Graphics,
  cell: GridCell,
  x: number,
  y: number,
  height: number,
  width: number,
  theme: Theme,
  gridSizes: GridSizes
): void {
  const { borderWidth, tableBorderWidth } = gridSizes.cell;
  let bgColor = theme.cell.bgColor;
  const cellBorder: PIXI.ILineStyleOptions = {
    width: borderWidth,
    color: theme.cell.borderColor,
  };
  const tableBorder: PIXI.ILineStyleOptions = {
    width: tableBorderWidth,
    color: theme.cell.tableBorderColor,
    alpha: theme.cell.tableBorderAlpha,
  };

  const isLeftTableBorder = cell?.table?.startCol === cell.startCol;
  const isBottomTableBorder = cell?.table?.endRow === cell.row;
  const borderRight =
    cell?.table?.endCol === cell.endCol ? tableBorder : cellBorder;
  const borderLeft = isLeftTableBorder ? tableBorder : cellBorder;
  const borderBottom = isBottomTableBorder ? tableBorder : cellBorder;
  const borderTop =
    cell?.table?.startRow === cell.row ? tableBorder : cellBorder;

  if (cell.isTableHeader) {
    bgColor = theme.cell.tableHeaderBgColor;
  } else if (cell.isFieldHeader) {
    bgColor = theme.cell.fieldHeaderBgColor;
  } else if (cell.totalIndex) {
    bgColor = theme.cell.totalBgColor;
  } else if (cell?.dataIndex && cell.dataIndex % 2 === 1) {
    bgColor = theme.cell.bgEvenColor;
  }

  let diffColor;
  if (
    cell.table?.isNewAdded ||
    cell.field?.isChanged ||
    cell.isOverrideChanged
  ) {
    diffColor = theme.diff.bgColor;
  }

  const cellStyle: CellStyle = {
    bgColor,
    diffColor,
    border: {
      borderTop,
      borderBottom,
      borderLeft,
      borderRight,
    },
  };

  const borderLeftXOffset = isLeftTableBorder ? tableBorderWidth / 2 : 0;
  const borderBottomYOffset = isBottomTableBorder ? tableBorderWidth / 2 : 0;
  applyCellStyle(
    graphics,
    cellStyle,
    x,
    y,
    width,
    height,
    borderLeftXOffset,
    borderBottomYOffset
  );
}

export function cropText(
  text: string,
  width: number,
  symbolWidth: number
): string {
  let currentTextWidth = 0;
  let croppedText = '';

  for (let i = 0; i < text.length; i++) {
    if (currentTextWidth + symbolWidth > width) {
      croppedText = croppedText.slice(0, croppedText.length - 1) + '…';

      return croppedText;
    }

    currentTextWidth += symbolWidth;
    croppedText += text[i];
  }

  return croppedText;
}

export function getSymbolWidth(fontSize: number, fontName: string): number {
  const text = new PIXI.BitmapText('0', { fontName, fontSize });
  const symbolWidth = text.width;

  text.destroy();

  return symbolWidth;
}

/**
 * Return table to the right or bottom of the cell (if exists)
 * @param getCell
 * @param col
 * @param row
 */
export function getCellContext(
  getCell: (col: number, row: number) => GridCell | undefined,
  col: number,
  row: number
): GridCell | undefined {
  const leftCell = getCell(col - 1, row);
  const isLeftCell = !!leftCell?.table && !leftCell.table?.isTableHorizontal;
  const topCell = getCell(col, row - 1);
  const isTopCell = !!topCell?.table && topCell.table?.isTableHorizontal;

  return isLeftCell ? leftCell : isTopCell ? topCell : undefined;
}

// Source: https://github.com/pixijs/pixijs/issues/1333
export function drawDashedRect(
  container: PIXI.Graphics,
  polygons: Coordinates[],
  innerBorder: PIXI.ILineStyleOptions,
  dash = 6,
  gap = 3
) {
  const x = 0;
  const y = 0;
  let dashLeft = 10;
  let gapLeft = 0;

  container.lineStyle(innerBorder);

  for (let i = 0; i < polygons.length; i++) {
    const p1 = polygons[i];
    let p2;

    if (i === polygons.length - 1) {
      p2 = polygons[0];
    } else {
      p2 = polygons[i + 1];
    }
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const normal = { x: dx / len, y: dy / len };
    let progressOnLine = 0;

    container.moveTo(
      x + p1.x + gapLeft * normal.x,
      y + p1.y + gapLeft * normal.y
    );

    while (progressOnLine <= len) {
      progressOnLine += gapLeft;

      if (dashLeft > 0) {
        progressOnLine += dashLeft;
      } else {
        progressOnLine += dash;
      }

      if (progressOnLine > len) {
        dashLeft = progressOnLine - len;
        progressOnLine = len;
      } else {
        dashLeft = 0;
      }

      container.lineTo(
        x + p1.x + progressOnLine * normal.x,
        y + p1.y + progressOnLine * normal.y
      );
      progressOnLine += gap;

      if (progressOnLine > len && dashLeft === 0) {
        gapLeft = progressOnLine - len;
      } else {
        gapLeft = 0;
        container.moveTo(
          x + p1.x + progressOnLine * normal.x,
          y + p1.y + progressOnLine * normal.y
        );
      }
    }
  }
}
