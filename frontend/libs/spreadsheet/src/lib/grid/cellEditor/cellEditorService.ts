import { injectable } from 'inversify';
import { Subject } from 'rxjs';

import { Destroyable } from '@deltix/grid-it';

import {
  GridCellEditorEvent,
  GridCellEditorEventInsertValue,
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

  insertValue(
    value: string,
    options?: GridCellEditorEventInsertValue['options']
  ) {
    this.cellEditorEvents$.next({
      type: GridCellEditorEventType.InsertValue,
      value,
      options,
    });
  }

  setPointClickValue(value: string) {
    this.cellEditorEvents$.next({
      type: GridCellEditorEventType.SetPointClickValue,
      value,
    });
  }

  openExplicitly(
    col: number,
    row: number,
    value: string,
    options?: {
      dimFieldName?: string;
      withFocus?: boolean;
    }
  ) {
    this.cellEditorEvents$.next({
      type: GridCellEditorEventType.OpenExplicitly,
      col,
      row,
      value,
      options,
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
