import { Container, FederatedPointerEvent, Graphics, Sprite } from 'pixi.js';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { GridStateContext } from '../../context';
import { useDraw } from '../../hooks';
import { getFullIconName } from '../Cells/utils';

type Props = {
  zIndex: number;
};

export function CornerRect({ zIndex }: Props) {
  const { gridSizes, theme, gridApi, eventBus } = useContext(GridStateContext);
  const containerRef = useRef<Container>(null);
  const graphicsRef = useRef<Graphics>(null);

  const expandIcon = useMemo(() => {
    return Sprite.from(getFullIconName('expand', theme.themeName));
  }, [theme]);

  // Set up icon event listeners once
  useEffect(() => {
    expandIcon.eventMode = 'static';
    expandIcon.cursor = 'pointer';

    const onPointerOver = (e: FederatedPointerEvent) => {
      if (!gridApi) return;

      const { x, y } = e.target as Sprite;
      const tooltipX = x + expandIcon.width / 2;
      const tooltipY = y + expandIcon.height / 2;

      gridApi.openTooltip(tooltipX, tooltipY, 'Expand spreadsheet');
    };

    const onPointerOut = () => {
      if (!gridApi) return;
      gridApi.closeTooltip();
    };

    const onPointerDown = () => {
      // Timeout to prevent selecting the entire grid column in useSelection hook
      setTimeout(() => {
        eventBus.emit({
          type: 'viewport/expand',
        });
      }, 0);
    };

    expandIcon.on('pointerover', onPointerOver);
    expandIcon.on('pointerout', onPointerOut);
    expandIcon.on('pointerdown', onPointerDown);

    // Add icon to container
    if (containerRef.current && !expandIcon.parent) {
      containerRef.current.addChild(expandIcon);
    }

    return () => {
      expandIcon.off('pointerover', onPointerOver);
      expandIcon.off('pointerout', onPointerOut);
      expandIcon.off('pointerdown', onPointerDown);
    };
  }, [expandIcon, gridApi, eventBus]);

  const draw = useCallback(() => {
    if (!graphicsRef.current) return;

    const graphics = graphicsRef.current;
    const { rowNumber, gridLine } = gridSizes;
    const width = rowNumber.width - gridLine.width;
    const height = rowNumber.height;

    graphics.clear();
    graphics.rect(0, 0, width, height).fill({ color: theme.rowNumber.bgColor });

    // Configure and position of the expand icon in the center
    expandIcon.width = gridSizes.cell.fontSize;
    expandIcon.height = gridSizes.cell.fontSize;
    expandIcon.x = (width - expandIcon.width) / 2;
    expandIcon.y = (height - expandIcon.height) / 2;
  }, [expandIcon, gridSizes, theme]);

  useDraw(draw);

  return (
    <pixiContainer
      eventMode="static"
      label="CornerRect"
      ref={containerRef}
      zIndex={zIndex}
    >
      <pixiGraphics
        draw={() => {}}
        label="CornerRectGraphics"
        ref={graphicsRef}
      />
    </pixiContainer>
  );
}
