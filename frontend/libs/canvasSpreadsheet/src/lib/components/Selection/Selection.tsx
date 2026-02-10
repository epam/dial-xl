import { Container, Graphics, Sprite } from 'pixi.js';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { GridStateContext, GridViewportContext } from '../../context';
import { useCellUtils, useDraw } from '../../hooks';
import { Rectangle } from '../../types';
import { drawDashedRect } from '../../utils';
import { getFullIconName } from '../Cells/utils';
import { useSelection } from './useSelection';

type Props = {
  zIndex: number;
};

export function Selection({ zIndex }: Props) {
  const {
    gridSizes,
    theme,
    pointClickError,
    pointClickMode,
    selectedTable,
    isTableDragging,
    selectedChart,
  } = useContext(GridStateContext);
  const { getCellX, getCellY, gridViewportSubscriber } =
    useContext(GridViewportContext);

  const selectionCoordsRef = useRef<Rectangle | null>(null);
  const containerRef = useRef<Container>(null);
  const graphicsRef = useRef<Graphics>(null);
  const dirtyRef = useRef(false);
  const prevRectRef = useRef<Rectangle | null>(null);
  const prevSelectedTableRef = useRef<string | null>(null);

  const { getDashedRectPolygons } = useCellUtils();
  const { selectionEdges } = useSelection();

  const moveTableIcon = useMemo(() => {
    return Sprite.from(getFullIconName('useArrowsMove', theme.themeName));
  }, [theme]);

  const getSelectionCoords = useCallback((): null | void => {
    if (!selectionEdges) {
      selectionCoordsRef.current = null;
      prevRectRef.current = null;
      prevSelectedTableRef.current = null;
      dirtyRef.current = true;

      return;
    }

    const { startRow, endRow, endCol, startCol } = selectionEdges;

    const x1 = getCellX(startCol < endCol ? startCol : startCol + 1);
    const y1 = getCellY(startRow < endRow ? startRow : startRow + 1);
    const x2 = getCellX(endCol <= startCol ? endCol : endCol + 1);
    const y2 = getCellY(endRow <= startRow ? endRow : endRow + 1);

    const next: Rectangle = {
      x: Math.min(x1, x2),
      y: Math.min(y1 + gridSizes.gridLine.width, y2 + gridSizes.gridLine.width),
      width: Math.abs(x2 - x1) - gridSizes.gridLine.width,
      height: Math.abs(y2 - y1) - gridSizes.gridLine.width,
    };

    const prev = prevRectRef.current;
    if (
      prev &&
      prev.x === next.x &&
      prev.y === next.y &&
      prev.width === next.width &&
      prev.height === next.height &&
      prevSelectedTableRef.current === selectedTable
    ) {
      return;
    }
    prevRectRef.current = next;
    selectionCoordsRef.current = next;
    dirtyRef.current = true;
    prevSelectedTableRef.current = selectedTable;
  }, [
    getCellX,
    getCellY,
    selectionEdges,
    selectedTable,
    gridSizes.gridLine.width,
  ]);

  useEffect(() => {
    return gridViewportSubscriber.current.subscribe(() => {
      getSelectionCoords();
    });
  }, [getSelectionCoords, gridViewportSubscriber]);

  useEffect(() => {
    getSelectionCoords();
  }, [getSelectionCoords]);

  const draw = useCallback((): undefined | null | void => {
    if (!graphicsRef.current || !containerRef.current) return;

    const graphics = graphicsRef.current;
    const container = containerRef.current;

    // Do not draw selection under the selected chart
    if (selectedChart && !isTableDragging) {
      graphics.clear();
      moveTableIcon.visible = false;

      return;
    }

    if (!dirtyRef.current) return;
    dirtyRef.current = false;

    const selectionCoords = selectionCoordsRef.current;
    graphics.clear();
    moveTableIcon.visible = false;

    if (!selectionCoords) return;

    const { borderColor, bgColor, bgAlpha, alpha, alignment } = theme.selection;
    const { x, y, width, height } = selectionCoords;
    const { selection } = gridSizes;

    if (!selectionEdges) return null;

    if (selectedTable && !isTableDragging) {
      // eslint-disable-next-line react-hooks/immutability
      moveTableIcon.x = x + selection.moveTableIconMargin;
      moveTableIcon.y = y + selection.moveTableIconMargin;
      moveTableIcon.width = selection.moveTableIconWidth;
      moveTableIcon.height = selection.moveTableIconHeight;
      moveTableIcon.visible = true;

      // Add icon to container if not already added
      if (!moveTableIcon.parent) {
        container.addChild(moveTableIcon);
      }
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
      .rect(x, y, width, height)
      .fill({ color: bgColor, alpha: bgAlpha })
      .stroke({
        width: gridSizes.selection.width,
        color: borderColor,
        alpha,
        alignment,
      });
  }, [
    getDashedRectPolygons,
    gridSizes,
    isTableDragging,
    moveTableIcon,
    pointClickError,
    pointClickMode,
    selectedTable,
    selectedChart,
    selectionEdges,
    theme.pointClickSelection,
    theme.selection,
  ]);

  useDraw(draw);

  return (
    <pixiContainer label="Selection" ref={containerRef} zIndex={zIndex}>
      <pixiGraphics
        draw={() => {}}
        label="SelectionGraphics"
        ref={graphicsRef}
      />
    </pixiContainer>
  );
}
