import { useContext, useEffect } from 'react';

import { ComponentLayer } from '../../constants';
import { GridStateContext } from '../../context';
import { Cells } from '../Cells';
import { ColNumbers } from '../ColNumbers';
import { ColResizer } from '../ColResizer';
import { CornerRect } from '../CornerRect';
import { DNDSelection } from '../DNDSelection';
import { DottedSelection } from '../DottedSelection';
import { Errors } from '../Errors';
import { GridLines } from '../GridLines';
import { HiddenCells } from '../HiddenCells';
import { NoteLabels } from '../Notes';
import { Overrides } from '../Overrides';
import { RowNumbers } from '../RowNumbers';
import { ScrollBar } from '../ScrollBar';
import { Selection } from '../Selection';
import { TableMoveHandle } from '../TableMoveHandle';

export function GridComponents() {
  const { app, theme, showGridLines } = useContext(GridStateContext);

  useEffect(() => {
    if (!app?.renderer?.background) return;

    app.renderer.background.alpha = 0;
    app.renderer.background.color = theme.grid.bgColor;
  }, [app, theme]);

  return (
    <pixiContainer label="GridComponents" sortableChildren>
      {showGridLines && <GridLines zIndex={ComponentLayer.GridLines} />}
      {showGridLines && <RowNumbers zIndex={ComponentLayer.RowNumbers} />}
      {showGridLines && <CornerRect zIndex={ComponentLayer.CornerRect} />}
      {showGridLines && <ColNumbers zIndex={ComponentLayer.ColNumbers} />}
      <ColResizer zIndex={ComponentLayer.Resizer} />
      <Cells zIndex={ComponentLayer.Cells} />
      <HiddenCells zIndex={ComponentLayer.HiddenCells} />
      <Selection zIndex={ComponentLayer.Selection} />
      <DNDSelection zIndex={ComponentLayer.DNDSelection} />
      <DottedSelection zIndex={ComponentLayer.DottedSelection} />
      <Overrides zIndex={ComponentLayer.Override} />
      <Errors zIndex={ComponentLayer.Error} />
      <NoteLabels zIndex={ComponentLayer.NoteLabel} />
      <TableMoveHandle zIndex={ComponentLayer.TableMoveHandle} />
      <ScrollBar zIndex={ComponentLayer.ScrollBar} />
    </pixiContainer>
  );
}
