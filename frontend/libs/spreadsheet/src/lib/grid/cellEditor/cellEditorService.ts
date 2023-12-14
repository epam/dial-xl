import { injectable } from 'inversify';
import { Subject } from 'rxjs';

import { Destroyable } from '@deltix/grid-it';

import {
  GridCellEditorEvent,
  GridCellEditorEventType,
  ICellEditorService,
} from './types';

@injectable()
export class CellEditorService
  extends Destroyable
  implements ICellEditorService
{
  cellEditorEvents$: Subject<GridCellEditorEvent> = new Subject();

  setValue(value: string) {
    this.cellEditorEvents$.next({
      type: GridCellEditorEventType.SetValue,
      value,
    });
  }

  openExplicitly(col: number, row: number, value: string) {
    this.cellEditorEvents$.next({
      type: GridCellEditorEventType.OpenExplicitly,
      col,
      row,
      value,
    });
  }

  focus() {
    this.cellEditorEvents$.next({
      type: GridCellEditorEventType.Focus,
    });
  }

  hide() {
    this.cellEditorEvents$.next({
      type: GridCellEditorEventType.Hide,
    });
  }

  destroy() {
    this.cellEditorEvents$.unsubscribe();
    super.destroy();
  }
}
