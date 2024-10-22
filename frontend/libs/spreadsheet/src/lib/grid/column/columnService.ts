import { inject, injectable } from 'inversify';
import { BehaviorSubject } from 'rxjs';
import { map, shareReplay, takeUntil } from 'rxjs/operators';

import { COLUMN_STATE_SERVICE, Destroyable, toRecord } from '@deltix/grid-it';
import type { IColumnStateService } from '@deltix/grid-it-core';
import {
  Column,
  ColumnGroup,
  IColumnGroupOptions,
  IColumnOptions,
  IColumnService,
  IColumnState,
} from '@deltix/grid-it-core';

import { compareState } from '../utils';
import { flatten } from './flatten';

const getNextId = (id: string, cache: Set<string>) => {
  if (!cache.has(id)) {
    cache.add(id);

    return id;
  }
  let i = 0;
  let newId = id;
  while (cache.has(newId)) {
    newId = `${id}_${++i}`;
  }
  cache.add(newId);

  return newId;
};

const toGroup = (
  column: IColumnGroupOptions,
  parent: ColumnGroup,
  cache: Set<string>
) => {
  const group = new ColumnGroup(column, parent);

  group.columns = toColumns(column.columns, group, cache);

  return group;
};

const toColumns = (
  columns: (IColumnOptions | IColumnGroupOptions)[],
  parent: ColumnGroup,
  cache: Set<string>
) => {
  if (!columns) {
    return [];
  }

  return columns.map((col) =>
    'columns' in col
      ? toGroup(col, parent, cache)
      : new Column(col, getNextId(col.id, cache))
  );
};

const buildColumns = (columns: (IColumnOptions | IColumnGroupOptions)[]) => {
  const idCache = new Set<string>();

  const defaultGroup = new ColumnGroup({ columns }, null as any as ColumnGroup);

  const cols = toColumns(columns, defaultGroup, idCache);

  defaultGroup.columns = cols;

  return defaultGroup;
};
/**
 * This service is legacy, there is no place for columns configuration in infinite spreadsheet.
 */
@injectable()
export class ColumnService extends Destroyable implements IColumnService {
  protected columnsTree = new BehaviorSubject<ColumnGroup>(
    null as any as ColumnGroup
  );
  protected flatAllColumns = new BehaviorSubject<Column[]>([]);
  protected flatAllColumnsMap!: Record<Column['id'], Column>;
  protected flatColumns = this.flatAllColumns.pipe(
    map((cols) => {
      return cols.filter((col) => !col.options.hidden);
    }),
    shareReplay(1)
  );
  protected viewColumnsTree!: ColumnGroup;
  protected state!: IColumnState[];

  get flat$() {
    return this.flatColumns;
  }

  get flatAll() {
    return this.flatAllColumns.value;
  }

  get flatAll$() {
    return this.flatAllColumns.asObservable();
  }

  get tree$() {
    return this.columnsTree.asObservable();
  }

  constructor(
    @inject(COLUMN_STATE_SERVICE) protected stateService: IColumnStateService
  ) {
    super();

    this.flatAllColumns
      .pipe(
        takeUntil(this.destroy$),
        map((cols) => toRecord(cols, 'id'))
      )
      .subscribe((map) => {
        this.flatAllColumnsMap = map;
      });

    this.stateService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.setFlatColumns(this.flatAllColumns.value, state);
      });
  }

  destroy() {
    this.columnsTree.complete();
    this.flatAllColumns.complete();
    super.destroy();
  }

  setColumns(columns: (IColumnOptions | IColumnGroupOptions)[]) {
    if (!columns) {
      return;
    }

    const cols = buildColumns(columns);
    this.columnsTree.next(cols);
    this.setFlatColumns(flatten(cols), this.state);
  }

  getColumnsById(id: string): Column | undefined {
    return this.flatAllColumnsMap?.[id];
  }

  protected setFlatColumns(columns: Column[], state: IColumnState[]) {
    if (this.flatAllColumns.value === columns && this.state === state) {
      return;
    }

    if (!state) {
      const newState: IColumnState[] = flatten(this.columnsTree.value).map(
        (col, i) => ({
          id: col.id,
          width: col.initial?.width,
          order: i,
          hidden: col.initial?.hidden,
          pin: col.options?.pin,
        })
      ) as IColumnState[];

      this.stateService.setState(newState as IColumnState[]);

      return;
    }

    if (!state.length) {
      this.state = columns.map((col, i) => ({
        id: col.id,
        width: col.width,
        order: i,
        hidden: col.hidden,
        pin: col.options?.pin,
      }));
      this.stateService.setState(this.state);
    }

    const stateMap = new Map<string, IColumnState>();
    for (const s of state) {
      stateMap.set(s.id, s);
    }

    const unknown: IColumnState[] = [];

    const known = new Set<string>();

    const cols = columns.map((col) => {
      known.add(col.id);
      if (!stateMap.has(col.id)) {
        unknown.push({
          id: col.id,
          width: col.width,
          order: Number.MAX_SAFE_INTEGER,
          hidden: col.hidden,
          pin: col.options?.pin,
        });

        return col;
      }
      const state = stateMap.get(col.id);

      col.options = {
        ...col.options,
        width: state?.width,
        hidden: state?.hidden,
      };

      return col;
    });

    this.flatAllColumns.next(
      cols.sort((col1, col2) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return compareState(stateMap.get(col1.id)!, stateMap.get(col2.id)!);
      })
    );

    const filtered = state.filter((st) => known.has(st.id));
    const hasUnknownState = filtered.length !== state.length;
    if (hasUnknownState) {
      state = filtered;
    }
    this.state = state;

    if (unknown.length || hasUnknownState) {
      this.stateService.setState([...state, ...unknown]);
    }
  }
}
