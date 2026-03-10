import { BitmapText, Graphics, StrokeStyle } from 'pixi.js';

import { GridSizes } from '../constants';
import { getChars } from '../setup';
import {
  CanvasOptions,
  CellStyle,
  Color,
  Coordinates,
  GridCell,
  Theme,
} from '../types';

function drawShadows({
  graphics,
  shadow,
  x,
  y,
  width,
  height,
}: {
  graphics: Graphics;
  shadow: CellStyle['shadow'];
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  if (shadow?.shadowBottom) {
    let accumulatedHeight = 0;
    shadow.shadowBottom.forEach((currentShadow) => {
      graphics
        .moveTo(x, y + height + accumulatedHeight)
        .lineTo(x + width, y + height + accumulatedHeight)
        .stroke({ ...currentShadow, alignment: 0 });

      accumulatedHeight += currentShadow.width ?? 1;
    });
  }
  if (shadow?.shadowBottomRight) {
    const defaultShift = shadow.shadowBottomRight[0].width ?? 1;
    let accumulatedHeight = 0;
    shadow.shadowBottomRight.forEach((currentShadow) => {
      graphics
        .moveTo(x + width, y + height + accumulatedHeight)
        .lineTo(
          x + width + defaultShift * shadow.shadowBottomRight!.length,
          y + height + accumulatedHeight,
        )
        .stroke({ ...currentShadow, alignment: 0 });

      accumulatedHeight += currentShadow.width ?? 1;
    });
  }
  if (shadow?.shadowBottomLeft) {
    const defaultShift = shadow.shadowBottomLeft[0].width ?? 1;
    let accumulatedHeight = 0;
    shadow.shadowBottomLeft.forEach((currentShadow) => {
      graphics
        .moveTo(
          x - defaultShift * shadow.shadowBottomLeft!.length,
          y + height + accumulatedHeight,
        )
        .lineTo(x, y + height + accumulatedHeight)
        .stroke({ ...currentShadow, alignment: 0 });

      accumulatedHeight += currentShadow.width ?? 1;
    });
  }
  if (shadow?.shadowTop) {
    const defaultShift = shadow.shadowTop[0].width ?? 1;
    let accumulatedHeight = 0;
    shadow.shadowTop.forEach((currentShadow) => {
      graphics
        .moveTo(x, y - accumulatedHeight - defaultShift)
        .lineTo(x + width, y - accumulatedHeight - defaultShift)
        .stroke({ ...currentShadow, alignment: 0 });

      accumulatedHeight += currentShadow.width ?? 1;
    });
  }
  if (shadow?.shadowTopRight) {
    const defaultShift = shadow.shadowTopRight[0].width ?? 1;
    let accumulatedHeight = 0;
    shadow.shadowTopRight.forEach((currentShadow) => {
      graphics
        .moveTo(x + width, y - accumulatedHeight - defaultShift)
        .lineTo(
          x + width + defaultShift * shadow.shadowTopRight!.length,
          y - accumulatedHeight - defaultShift,
        )
        .stroke({ ...currentShadow, alignment: 0 });

      accumulatedHeight += currentShadow.width ?? 1;
    });
  }
  if (shadow?.shadowTopLeft) {
    const defaultShift = shadow.shadowTopLeft[0].width ?? 1;
    let accumulatedHeight = 0;
    shadow.shadowTopLeft.forEach((currentShadow) => {
      graphics
        .moveTo(
          x - defaultShift * shadow.shadowTopLeft!.length,
          y - accumulatedHeight - defaultShift,
        )
        .lineTo(x, y - accumulatedHeight - defaultShift)
        .stroke({ ...currentShadow, alignment: 0 });

      accumulatedHeight += currentShadow.width ?? 1;
    });
  }
  if (shadow?.shadowRight) {
    const defaultShift = shadow.shadowRight[0].width ?? 1;
    let accumulatedWidth = 0;
    shadow.shadowRight.forEach((currentShadow) => {
      graphics
        .moveTo(x + width + accumulatedWidth + defaultShift, y)
        .lineTo(x + width + accumulatedWidth + defaultShift, y + height)
        .stroke({ ...currentShadow, alignment: 0 });

      accumulatedWidth += currentShadow.width ?? 1;
    });
  }
  if (shadow?.shadowLeft) {
    let accumulatedWidth = 0;
    shadow.shadowLeft.forEach((currentShadow) => {
      graphics
        .moveTo(x - accumulatedWidth, y)
        .lineTo(x - accumulatedWidth, y + height)
        .stroke({ ...currentShadow, alignment: 0 });

      accumulatedWidth += currentShadow.width ?? 1;
    });
  }
}

export function applyCellStyle({
  graphics,
  text,
  style,
  x,
  y,
  width,
  height,
  gridSizes,
}: {
  graphics: Graphics;
  text: { alpha: number };
  style: CellStyle;
  x: number;
  y: number;
  width: number;
  height: number;
  gridSizes: GridSizes;
}): void {
  const gridLineWidth = gridSizes.gridLine.width;
  if (style.bgColor) {
    graphics
      .rect(x, y + gridLineWidth, width - gridLineWidth, height - gridLineWidth)
      .fill({ color: style.bgColor });
  }

  if (style.highlight) {
    graphics
      .rect(x, y + gridLineWidth, width - gridLineWidth, height - gridLineWidth)
      .fill({ color: style.highlight.color, alpha: style.highlight.alpha });

    text.alpha = style.highlight.textAlpha;
  } else {
    text.alpha = 1;
  }

  if (style.border) {
    const { border } = style;

    if (border?.borderTop) {
      graphics
        .moveTo(x - gridLineWidth, y)
        .lineTo(x + width, y)
        .stroke({
          ...border.borderTop,
          alignment: 0,
        });
    }

    if (border?.borderRight) {
      graphics
        .moveTo(x + width, y)
        .lineTo(x + width, y + height)
        .stroke({
          ...border.borderRight,
          alignment: 0,
        });
    }

    if (border?.borderLeft) {
      graphics
        .moveTo(x, y)
        .lineTo(x, y + height)
        .stroke({
          ...border.borderLeft,
          alignment: 0,
        });
    }

    if (border?.borderBottom) {
      graphics
        .moveTo(x - gridLineWidth, y + height)
        .lineTo(x + width, y + height)
        .stroke({
          ...border.borderBottom,
          alignment: 0,
        });
    }
  }

  drawShadows({
    graphics,
    shadow: style.shadow,
    x,
    y,
    width,
    height,
  });
}

export function applyCellGraphics(
  graphics: Graphics,
  text: { alpha: number },
  cell: GridCell,
  bottomCell: GridCell | undefined,
  x: number,
  y: number,
  height: number,
  width: number,
  theme: Theme,
  gridSizes: GridSizes,
  canvasOptions: CanvasOptions,
): void {
  const { borderWidth, shadowStepWidth: shadowLineWidth } = gridSizes.cell;
  const isChartCell = cell.table?.chartType;
  let bgColor: Color | undefined = theme.cell.bgColor;

  if (!canvasOptions.showTableBorders) {
    applyCellStyle({
      graphics,
      text,
      style: {
        bgColor,
      },
      x,
      y,
      width,
      height,
      gridSizes,
    });

    return;
  }

  let highlight;
  if (cell.table?.highlightType || cell.field?.highlightType) {
    const highlightType =
      cell.field?.highlightType ?? cell.table?.highlightType;

    highlight =
      highlightType === 'DIMMED'
        ? theme.highlight.dimmed
        : highlightType === 'HIGHLIGHTED'
          ? theme.highlight.highlighted
          : undefined;
  }

  const cellBorder: StrokeStyle = {
    width: borderWidth,
    color: theme.cell.borderColor,
    alpha: highlight?.negativeAlpha ?? 1,
  };

  const bottomRightShadow: StrokeStyle[] = [
    {
      width: shadowLineWidth,
      color: theme.tableShadow.color,
      alpha: 0.5 * (highlight?.negativeAlpha ?? 1),
    },
    {
      width: shadowLineWidth,
      color: theme.tableShadow.color,
      alpha: 0.35 * (highlight?.negativeAlpha ?? 1),
    },
  ];
  const topLeftShadow: StrokeStyle[] = [
    {
      width: shadowLineWidth,
      color: theme.tableShadow.color,
      alpha: 0.425 * (highlight?.negativeAlpha ?? 1),
    },
    {
      width: shadowLineWidth,
      color: theme.tableShadow.color,
      alpha: 0.25 * (highlight?.negativeAlpha ?? 1),
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

  if (cell.isTableHeader && cell.table?.isTableNameHeaderHidden) {
    bgColor = theme.cell.bgColor;
  }

  let borderTop: StrokeStyle | undefined = cellBorder;
  let borderRight: StrokeStyle | undefined = cellBorder;
  let borderBottom: StrokeStyle | undefined = cellBorder;
  let borderLeft: StrokeStyle | undefined = cellBorder;

  // This border style is needed for top and right chart borders
  // because cells under the chart override grid lines
  if (isChartCell) {
    const chartBorder: StrokeStyle = {
      width: gridSizes.gridLine.width,
      color: theme.grid.lineColor,
    };

    borderTop = isTopTableCell ? chartBorder : undefined;
    borderRight = isRightTableCell ? chartBorder : undefined;
    borderBottom = isBottomTableCell ? chartBorder : undefined;
    borderLeft = isLeftTableCell ? chartBorder : undefined;
  }

  const cellStyle: CellStyle = {
    bgColor,
    highlight: highlight && {
      color: highlight.bgColor,
      alpha: highlight.alpha,
      textAlpha: highlight.textAlpha,
    },
    border: {
      borderTop,
      borderLeft: isChartCell ? undefined : borderLeft,
      borderRight,
      borderBottom: isChartCell ? undefined : borderBottom,
    },
    shadow: isChartCell
      ? undefined
      : {
          shadowRight: isRightTableCell ? bottomRightShadow : undefined,
          shadowLeft: isLeftTableCell ? topLeftShadow : undefined,
          shadowBottom: isBottomTableCell ? bottomRightShadow : undefined,
          shadowTop: isTopTableCell ? topLeftShadow : undefined,
          shadowBottomRight: isBottomRightTableCell
            ? bottomRightShadow
            : undefined,
          shadowBottomLeft: isBottomLeftTableCell
            ? bottomRightShadow
            : undefined,
          shadowTopRight: isTopRightTableCell ? topLeftShadow : undefined,
          shadowTopLeft: isTopLeftTableCell ? topLeftShadow : undefined,
        },
  };

  applyCellStyle({
    graphics,
    text,
    style: cellStyle,
    x,
    y,
    width,
    height,
    gridSizes,
  });
}

export function cropText(
  text: string,
  width: number,
  symbolWidth: number,
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

export function hashText(
  text: string,
  width: number,
  symbolWidth: number,
): string {
  let currentTextWidth = 0;
  let croppedText = '';

  const singleLineText = text.replaceAll('\r', '').replaceAll('\n', ' ');

  for (let i = 0; i < singleLineText.length; i++) {
    if (currentTextWidth + symbolWidth > width) {
      return '#'.repeat(i);
    }

    currentTextWidth += symbolWidth;
    croppedText += singleLineText[i];
  }

  return croppedText;
}

export function getSymbolWidth(fontSize: number, fontName: string): number {
  const chars = getChars();
  const text = new BitmapText({
    text: chars,
    style: {
      fontFamily: fontName,
      fontSize,
      fill: 0xffffff,
    },
  });
  const symbolWidth = text.width;

  text.destroy();

  return symbolWidth / chars.length;
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
  row: number,
): GridCell | undefined {
  const leftCell = getCell(col - 1, row);
  const isLeftCell = !!leftCell?.table && !leftCell.table?.isTableHorizontal;
  const topCell = getCell(col, row - 1);
  const isTopCell = !!topCell?.table && topCell.table?.isTableHorizontal;

  return isLeftCell ? leftCell : isTopCell ? topCell : undefined;
}

function dashedSegment(
  g: Graphics,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  dash = 6,
  gap = 3,
) {
  const pattern = dash + gap;

  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  const nx = dx / len;
  const ny = dy / len;
  let dist = 0;

  while (dist < len) {
    const from = Math.max(dist, 0);
    const to = Math.min(dist + dash, len);

    if (to > 0) {
      g.moveTo(ax + nx * from, ay + ny * from);
      g.lineTo(ax + nx * to, ay + ny * to);
    }

    dist += pattern;
  }
}

export function drawDashedRect(
  g: Graphics,
  polygon: Coordinates[],
  innerBorder: StrokeStyle,
  dash = 6,
  gap = 3,
) {
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    dashedSegment(g, p1.x, p1.y, p2.x, p2.y, dash, gap);
  }
  g.stroke(innerBorder);
}
