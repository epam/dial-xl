import * as PIXI from 'pixi.js';

import { GridCell } from '@frontend/common';

import { GridSizes } from '../constants';
import { CellStyle, Coordinates, Theme } from '../types';

function drawShadows(
  graphics: PIXI.Graphics,
  shadow: CellStyle['shadow'],
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (shadow?.shadowBottom) {
    let accumulatedHeight = 0;
    shadow.shadowBottom.forEach((currentShadow) => {
      graphics
        .lineStyle({ ...currentShadow, alignment: 0 })
        .moveTo(x, y + height + accumulatedHeight)
        .lineTo(x + width, y + height + accumulatedHeight);

      accumulatedHeight += currentShadow.width ?? 1;
    });
  }
  if (shadow?.shadowBottomRight) {
    const defaultShift = shadow.shadowBottomRight[0].width ?? 1;
    let accumulatedHeight = 0;
    shadow.shadowBottomRight.forEach((currentShadow) => {
      graphics
        .lineStyle({ ...currentShadow, alignment: 0 })
        .moveTo(x + width, y + height + accumulatedHeight)
        .lineTo(
          x + width + defaultShift * shadow.shadowBottomRight!.length,
          y + height + accumulatedHeight
        );

      accumulatedHeight += currentShadow.width ?? 1;
    });
  }
  if (shadow?.shadowBottomLeft) {
    const defaultShift = shadow.shadowBottomLeft[0].width ?? 1;
    let accumulatedHeight = 0;
    shadow.shadowBottomLeft.forEach((currentShadow) => {
      graphics
        .lineStyle({ ...currentShadow, alignment: 0 })
        .moveTo(
          x - defaultShift * shadow.shadowBottomLeft!.length,
          y + height + accumulatedHeight
        )
        .lineTo(x, y + height + accumulatedHeight);

      accumulatedHeight += currentShadow.width ?? 1;
    });
  }
  if (shadow?.shadowTop) {
    const defaultShift = shadow.shadowTop[0].width ?? 1;
    let accumulatedHeight = 0;
    shadow.shadowTop.forEach((currentShadow) => {
      graphics
        .lineStyle({ ...currentShadow, alignment: 0 })
        .moveTo(x, y - accumulatedHeight - defaultShift)
        .lineTo(x + width, y - accumulatedHeight - defaultShift);

      accumulatedHeight += currentShadow.width ?? 1;
    });
  }
  if (shadow?.shadowTopRight) {
    const defaultShift = shadow.shadowTopRight[0].width ?? 1;
    let accumulatedHeight = 0;
    shadow.shadowTopRight.forEach((currentShadow) => {
      graphics
        .lineStyle({ ...currentShadow, alignment: 0 })
        .moveTo(x + width, y - accumulatedHeight - defaultShift)
        .lineTo(
          x + width + defaultShift * shadow.shadowTopRight!.length,
          y - accumulatedHeight - defaultShift
        );

      accumulatedHeight += currentShadow.width ?? 1;
    });
  }
  if (shadow?.shadowTopLeft) {
    const defaultShift = shadow.shadowTopLeft[0].width ?? 1;
    let accumulatedHeight = 0;
    shadow.shadowTopLeft.forEach((currentShadow, index) => {
      graphics
        .lineStyle({ ...currentShadow, alignment: 0 })
        .moveTo(
          x - defaultShift * shadow.shadowTopLeft!.length,
          y - accumulatedHeight - defaultShift
        )
        .lineTo(x, y - accumulatedHeight - defaultShift);

      accumulatedHeight += currentShadow.width ?? 1;
    });
  }
  if (shadow?.shadowRight) {
    const defaultShift = shadow.shadowRight[0].width ?? 1;
    let accumulatedWidth = 0;
    shadow.shadowRight.forEach((currentShadow) => {
      graphics
        .lineStyle({ ...currentShadow, alignment: 0 })
        .moveTo(x + width + accumulatedWidth + defaultShift, y)
        .lineTo(x + width + accumulatedWidth + defaultShift, y + height);

      accumulatedWidth += currentShadow.width ?? 1;
    });
  }
  if (shadow?.shadowLeft) {
    let accumulatedWidth = 0;
    shadow.shadowLeft.forEach((currentShadow) => {
      graphics
        .lineStyle({ ...currentShadow, alignment: 0 })
        .moveTo(x - accumulatedWidth, y)
        .lineTo(x - accumulatedWidth, y + height);

      accumulatedWidth += currentShadow.width ?? 1;
    });
  }

  graphics.lineStyle({});
}

export function applyCellStyle(
  graphics: PIXI.Graphics,
  style: CellStyle,
  x: number,
  y: number,
  width: number,
  height: number
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
        .moveTo(x, y)
        .lineTo(x, y + height);
    }

    graphics.lineStyle({});
  }

  drawShadows(graphics, style.shadow, x, y, width, height);
}

export function applyCellGraphics(
  graphics: PIXI.Graphics,
  cell: GridCell,
  bottomCell: GridCell | undefined,
  x: number,
  y: number,
  height: number,
  width: number,
  theme: Theme,
  gridSizes: GridSizes
): void {
  const { borderWidth, shadowStepWidth: shadowLineWidth } = gridSizes.cell;
  let bgColor = theme.cell.bgColor;
  const cellBorder: PIXI.ILineStyleOptions = {
    width: borderWidth,
    color: theme.cell.borderColor,
  };

  const bottomRightShadow: PIXI.ILineStyleOptions[] = [
    {
      width: shadowLineWidth,
      color: theme.tableShadow.color,
      alpha: 0.5,
    },
    {
      width: shadowLineWidth,
      color: theme.tableShadow.color,
      alpha: 0.35,
    },
  ];
  const topLeftShadow: PIXI.ILineStyleOptions[] = [
    {
      width: shadowLineWidth,
      color: theme.tableShadow.color,
      alpha: 0.425,
    },
    {
      width: shadowLineWidth,
      color: theme.tableShadow.color,
      alpha: 0.25,
    },
  ];

  const isBottomTableCell =
    bottomCell?.table?.tableName !== cell.table?.tableName;
  const isRightTableCell = cell?.table?.endCol === cell.endCol;
  const isTopTableCell =
    cell?.table?.startRow === cell.row || cell.isTableHeader;
  const isLeftTableCell =
    cell?.table?.startCol === cell.col || cell.isTableHeader;
  const isTopRightTableCell = isRightTableCell && isTopTableCell;
  const isTopLeftTableCell = isLeftTableCell && isTopTableCell;
  const isBottomRightTableCell = isRightTableCell && isBottomTableCell;
  const isBottomLeftTableCell = isLeftTableCell && isBottomTableCell;

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
    cell.table?.isChanged ||
    cell.field?.isChanged ||
    cell.isOverrideChanged
  ) {
    diffColor = theme.diff.bgColor;
  }

  const cellStyle: CellStyle = {
    bgColor,
    diffColor,
    border: {
      borderTop: cellBorder,
      borderLeft: cellBorder,
      borderRight: cellBorder,
    },
    shadow: {
      shadowRight: isRightTableCell ? bottomRightShadow : undefined,
      shadowLeft: isLeftTableCell ? topLeftShadow : undefined,
      shadowBottom: isBottomTableCell ? bottomRightShadow : undefined,
      shadowTop: isTopTableCell ? topLeftShadow : undefined,
      shadowBottomRight: isBottomRightTableCell ? bottomRightShadow : undefined,
      shadowBottomLeft: isBottomLeftTableCell ? bottomRightShadow : undefined,
      shadowTopRight: isTopRightTableCell ? topLeftShadow : undefined,
      shadowTopLeft: isTopLeftTableCell ? topLeftShadow : undefined,
    },
  };

  applyCellStyle(graphics, cellStyle, x, y, width, height);
}

export function cropText(
  text: string,
  width: number,
  symbolWidth: number
): string {
  let currentTextWidth = 0;
  let croppedText = '';

  const singleLineText = text.replaceAll('\r', '').replaceAll('\n', ' ');

  for (let i = 0; i < singleLineText.length; i++) {
    if (currentTextWidth + symbolWidth > width) {
      const prevCroppedText = croppedText.slice(0, croppedText.length - 1);
      croppedText = prevCroppedText.length ? prevCroppedText + '…' : '';

      return croppedText;
    }

    currentTextWidth += symbolWidth;
    croppedText += singleLineText[i];
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
