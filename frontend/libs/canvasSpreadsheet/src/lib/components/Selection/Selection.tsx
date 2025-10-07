import * as PIXI from 'pixi.js';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Graphics } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { useCellUtils, useDraw } from '../../hooks';
import { Rectangle } from '../../types';
import { drawDashedRect } from '../../utils';
import { getFullIconName } from '../Cells/utils';
import { useSelection } from './useSelection';

export function Selection() {
  const {
    gridSizes,
    theme,
    pointClickError,
    pointClickMode,
    selectedTable,
    isTableDragging,
  } = useContext(GridStateContext);
  const { getCellX, getCellY, gridViewportSubscriber } =
    useContext(GridViewportContext);

  const [selectionCoords, setSelectionCoords] = useState<Rectangle | null>(
    null
  );

  const graphicsRef = useRef<PIXI.Graphics>(null);

  const { getDashedRectPolygons } = useCellUtils();
  const { selectionEdges } = useSelection();

  const moveTableIcon = useMemo(() => {
    return PIXI.Sprite.from(getFullIconName('useArrowsMove', theme.themeName), {
      resourceOptions: { scale: 4 },
    });
  }, [theme]);

  const getSelectionCoords = useCallback((): null | void => {
    if (!selectionEdges) return null;

    const { startRow, endRow, endCol, startCol } = selectionEdges;

    const x1 = getCellX(startCol < endCol ? startCol : startCol + 1);
    const y1 = getCellY(startRow < endRow ? startRow : startRow + 1);
    const x2 = getCellX(endCol <= startCol ? endCol : endCol + 1);
    const y2 = getCellY(endRow <= startRow ? endRow : endRow + 1);

    setSelectionCoords({
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    });
  }, [getCellX, getCellY, selectionEdges]);

  useEffect(() => {
    return gridViewportSubscriber.current.subscribe(() => {
      getSelectionCoords();
    });
  }, [getSelectionCoords, gridViewportSubscriber]);

  useEffect(() => {
    getSelectionCoords();
  }, [getSelectionCoords]);

  const draw = useCallback((): undefined | null | void => {
    if (!graphicsRef.current) return;

    const graphics = graphicsRef.current;
    graphics.clear();
    graphics.removeChildren();

    if (!selectionCoords) return;

    const { borderColor, bgColor, bgAlpha } = theme.selection;
    const { x, y, width, height } = selectionCoords;
    const { selection } = gridSizes;

    if (!selectionEdges) return null;

    if (selectedTable && !isTableDragging) {
      moveTableIcon.x = x + selection.moveTableIconMargin;
      moveTableIcon.y = y + selection.moveTableIconMargin;
      moveTableIcon.width = selection.moveTableIconWidth;
      moveTableIcon.height = selection.moveTableIconHeight;
      graphics.addChild(moveTableIcon);
    } else {
      graphics.removeChild(moveTableIcon);
    }

    if (pointClickMode) {
      const { color, errorColor, alpha, alignment } = theme.pointClickSelection;
      const styles = {
        width: gridSizes.pointClick.width,
        color: pointClickError ? errorColor : color,
        alignment,
        alpha,
      };

      drawDashedRect(graphics, getDashedRectPolygons(selectionEdges), styles);

      return;
    }

    graphics
      .lineStyle(gridSizes.selection.width, borderColor)
      .beginFill(bgColor, bgAlpha)
      .drawRect(x, y, width, height)
      .endFill();
  }, [
    getDashedRectPolygons,
    gridSizes,
    isTableDragging,
    moveTableIcon,
    pointClickError,
    pointClickMode,
    selectedTable,
    selectionCoords,
    selectionEdges,
    theme.pointClickSelection,
    theme.selection,
  ]);

  useDraw(draw);

  return <Graphics ref={graphicsRef} zIndex={ComponentLayer.Selection} />;
}
