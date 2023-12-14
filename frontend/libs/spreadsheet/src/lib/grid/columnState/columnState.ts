import { injectable } from 'inversify';
import { BehaviorSubject } from 'rxjs';

import {
  IColumnState,
  IColumnStateService,
  IFilterState,
  ResizedBy,
  SortDirection,
} from '@deltix/grid-it-core';

import { compareState } from '../utils';

@injectable()
export class ColumnStateService implements IColumnStateService {
  protected state = new BehaviorSubject<IColumnState[]>([]);

  // TODO Maybe split into resized$, reordered$, hidden$, etc...
  get state$() {
    return this.state.asObservable();
  }

  getState(): IColumnState[] {
    return this.state.value;
  }

  setState(state: IColumnState[] | null) {
    if (state) {
      this.state.next(state.sort(compareState));
    }
  }

  move(id: string, index: number) {
    const state = [...this.state.value];
    const prevIndex = this.state.value.findIndex((el) => el.id === id);
    if (prevIndex === -1 || prevIndex === index) {
      return;
    }
    const prev = state.splice(prevIndex, 1);
    if (prevIndex + 1 < index) {
      index--;
    }

    state.splice(index, 0, ...prev);
    this.setState(state.map((item, i) => ({ ...item, order: i })));
  }

  resize(id: string, width: number, by: ResizedBy) {
    if (width <= 0) {
      return;
    }
    const state = this.state.value.map((col) => {
      if (col.id !== id) {
        return col;
      }

      return { ...col, width, resizedBy: by };
    });
    this.setState(state);
  }

  changeVisibility(id: string, hidden: boolean) {
    this.setState(
      this.state.value.map((state) => {
        return state.id === id ? { ...state, hidden } : state;
      })
    );
  }

  changeVisibilityBulk(
    map: Record</* colId */ string, /* isVisible */ boolean>
  ) {
    this.setState(
      this.state.value.map((colState) => {
        if (typeof map[colState.id] !== 'boolean') {
          return colState;
        }

        return {
          ...colState,
          hidden: !map[colState.id],
        };
      })
    );
  }

  setFilter(id: string, filter: IFilterState) {
    this.setState(
      this.state.value.map((state) => {
        return state.id === id ? { ...state, filter } : state;
      })
    );
  }

  reset() {
    this.setState(null);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setSort(id: string, dir: SortDirection | undefined, isMulti: boolean) {}
}
