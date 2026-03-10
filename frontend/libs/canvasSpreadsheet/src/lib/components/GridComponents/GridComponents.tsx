import { useContext } from 'react';

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
  const { showGridLines, canvasOptions } = useContext(GridStateContext);

  return (
    <pixiContainer label="GridComponents" sortableChildren>
      {showGridLines && <GridLines zIndex={ComponentLayer.GridLines} />}
      {showGridLines && <RowNumbers zIndex={ComponentLayer.RowNumbers} />}
      {showGridLines && <CornerRect zIndex={ComponentLayer.CornerRect} />}
      {showGridLines && <ColNumbers zIndex={ComponentLayer.ColNumbers} />}
      {canvasOptions.showResizers && (
        <ColResizer zIndex={ComponentLayer.Resizer} />
      )}
      <Cells zIndex={ComponentLayer.Cells} />
      {canvasOptions.showHiddenCells && (
        <HiddenCells zIndex={ComponentLayer.HiddenCells} />
      )}
      {canvasOptions.showSelection && (
        <Selection zIndex={ComponentLayer.Selection} />
      )}
      {canvasOptions.showDNDSelection && (
        <DNDSelection zIndex={ComponentLayer.DNDSelection} />
      )}
      {canvasOptions.showDottedSelection && (
        <DottedSelection zIndex={ComponentLayer.DottedSelection} />
      )}
      {canvasOptions.showOverrides && (
        <Overrides zIndex={ComponentLayer.Override} />
      )}
      {canvasOptions.showErrors && <Errors zIndex={ComponentLayer.Error} />}
      {canvasOptions.showNotes && (
        <NoteLabels zIndex={ComponentLayer.NoteLabel} />
      )}
      {canvasOptions.enableMoveTable && (
        <TableMoveHandle zIndex={ComponentLayer.TableMoveHandle} />
      )}
      <ScrollBar zIndex={ComponentLayer.ScrollBar} />
    </pixiContainer>
  );
}
