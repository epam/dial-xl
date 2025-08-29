import * as PIXI from 'pixi.js';
import { useCallback, useContext } from 'react';

import { Graphics } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext } from '../../context';

export function CornerRect() {
  const { gridSizes, theme } = useContext(GridStateContext);

  const draw = useCallback(
    (graphics: PIXI.Graphics) => {
      const { rowNumber, gridLine } = gridSizes;
      graphics
        .clear()
        .beginFill(theme.rowNumber.bgColor)
        .drawRect(0, 0, rowNumber.width - gridLine.width, rowNumber.height)
        .endFill();
    },
    [gridSizes, theme]
  );

  return (
    <Graphics draw={draw} eventMode="none" zIndex={ComponentLayer.CornerRect} />
  );
}
