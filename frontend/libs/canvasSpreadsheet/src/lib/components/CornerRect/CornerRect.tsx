import * as PIXI from 'pixi.js';
import { useCallback, useContext, useMemo, useRef } from 'react';

import { Graphics } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext } from '../../context';
import { getFullIconName } from '../Cells/utils';

export function CornerRect() {
  const { gridSizes, theme, gridApi, gridCallbacks } =
    useContext(GridStateContext);
  const graphicsRef = useRef<PIXI.Graphics>(null);

  const expandIcon = useMemo(() => {
    return PIXI.Sprite.from(getFullIconName('expand', theme.themeName));
  }, [theme]);

  const draw = useCallback(
    (graphics: PIXI.Graphics) => {
      const { rowNumber, gridLine } = gridSizes;
      const width = rowNumber.width - gridLine.width;
      const height = rowNumber.height;

      graphics
        .clear()
        .beginFill(theme.rowNumber.bgColor)
        .drawRect(0, 0, width, height)
        .endFill();

      graphics.removeChildren();

      // Configure and position of the expand icon in the center
      expandIcon.width = gridSizes.cell.fontSize;
      expandIcon.height = gridSizes.cell.fontSize;
      expandIcon.x = (width - expandIcon.width) / 2;
      expandIcon.y = (height - expandIcon.height) / 2;
      expandIcon.eventMode = 'static';
      expandIcon.cursor = 'pointer';
      expandIcon.removeAllListeners('pointerover');
      expandIcon.removeAllListeners('pointerout');
      expandIcon.removeAllListeners('pointerdown');

      expandIcon.addEventListener(
        'pointerover',
        function onPointerOver(e: PIXI.FederatedPointerEvent) {
          if (!gridApi) return;

          const { x, y } = e.target as PIXI.Sprite;
          const tooltipX = x + expandIcon.width / 2;
          const tooltipY = y + expandIcon.height / 2;

          gridApi.openTooltip(tooltipX, tooltipY, 'Expand spreadsheet');
        }
      );

      expandIcon.addEventListener('pointerout', function onPointerOut() {
        if (!gridApi) return;
        gridApi.closeTooltip();
      });

      expandIcon.addEventListener('pointerdown', function onPointerDown() {
        // Timeout to prevent selecting the entire grid column in useSelection hook
        setTimeout(() => {
          gridCallbacks.onGridExpand?.();
        }, 0);
      });

      graphics.addChild(expandIcon);
    },
    [expandIcon, gridApi, gridSizes, gridCallbacks, theme]
  );

  return (
    <Graphics
      draw={draw}
      eventMode="static"
      ref={graphicsRef}
      zIndex={ComponentLayer.CornerRect}
    />
  );
}
