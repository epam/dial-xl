import { Container } from 'inversify';
import { first } from 'rxjs/operators';

import {
  COLUMN_SERVICE,
  COLUMN_STATE_SERVICE,
  COMMON_COMPONENT,
  DATA_SCROLLER,
  DATA_SERVICE,
  DATA_VIEW,
  Destroyable,
  EVENTS_SERVICE,
  HEADER,
  ROW_SERVICE,
} from '@deltix/grid-it';
import {
  GridItOptions,
  GridItOptionsInternal,
  IColumnService,
  IColumnState,
  IColumnStateService,
  IDataScroller,
  ResizedBy,
} from '@deltix/grid-it-core';

import { gridRoot } from '../constants';
import { defaults } from '../defaults';
import { isCellEditorHasFocus, isCellEditorOpen } from '../utils';
import { ICellEditorService } from './cellEditor';
import { DataView, GridCell, GridData, IDataService } from './data';
import { IEventsService } from './events';
import { IHeader } from './header';
import { initContainer } from './initContainer';
import { IRowService } from './row';
import { IRowNumberService } from './rowNumber';
import {
  GridSelection,
  GridSelectionShortcut,
  ISelectionService,
} from './selection';
import {
  CELL_EDITOR_SERVICE,
  ROW_NUMBER_SERVICE,
  SELECTION_SERVICE,
} from './types';
import { prepareInternalOptions } from './utils';

import './grid.scss';
import 'reflect-metadata';

export class Grid extends Destroyable {
  private container: Container;

  private options: GridItOptionsInternal<GridData>;

  private columnService: IColumnService;
  private columnStateService: IColumnStateService;

  private dataService: IDataService;

  private rowService: IRowService;

  private selectionService: ISelectionService;

  private rowNumberService: IRowNumberService;

  private cellEditorService: ICellEditorService;

  private header: IHeader;

  private dataView: DataView;

  get events$() {
    return this.container.get<IEventsService>(EVENTS_SERVICE).events$;
  }

  get selection$() {
    return this.selectionService.selection$;
  }

  get scroll$() {
    return this.dataView.scroll$;
  }

  get rowNumberResize$() {
    return this.dataView.rowNumberResize$;
  }

  get selectionShortcuts$() {
    return this.selectionService.shortcuts$.asObservable();
  }

  sendSelectionEvent(event: GridSelectionShortcut) {
    this.selectionService.shortcuts$.next(event);
  }

  get cellEditorEvent$() {
    return this.cellEditorService.cellEditorEvents$;
  }

  get rowEdges() {
    return this.dataView.edges;
  }

  get colEdges() {
    return this.dataView.columnsEdges;
  }

  get selectionEvents$() {
    return this.selectionService.selectionEvents$;
  }

  constructor(rootElement: HTMLElement, options: GridItOptions<GridData>) {
    super();

    this.options = prepareInternalOptions<GridData>(options, rootElement);

    this.container = initContainer(this.options);

    this.rowService = this.container.get<IRowService>(ROW_SERVICE);

    this.columnService = this.container.get<IColumnService>(COLUMN_SERVICE);

    this.header = this.container.get<IHeader>(HEADER);

    this.columnStateService =
      this.container.get<IColumnStateService>(COLUMN_STATE_SERVICE);
    this.columnService.setColumns(this.options.columns);

    this.dataView = this.container.get<DataView>(DATA_VIEW);

    this.dataService = this.container.get<IDataService>(DATA_SERVICE);

    this.selectionService =
      this.container.get<ISelectionService>(SELECTION_SERVICE);

    this.rowNumberService =
      this.container.get<IRowNumberService>(ROW_NUMBER_SERVICE);

    this.cellEditorService =
      this.container.get<ICellEditorService>(CELL_EDITOR_SERVICE);

    if (options?.initialState) {
      this.setState(options.initialState);
    }

    this.mount(rootElement);

    // initialize common
    if (this.container.isBound(COMMON_COMPONENT)) {
      this.container.getAll(COMMON_COMPONENT);
    }
  }

  private mount = (rootElement: HTMLElement) => {
    rootElement.classList.add(gridRoot);

    const dataScroller = this.container.get<IDataScroller>(DATA_SCROLLER);

    this.columnService.flat$.pipe(first()).subscribe(() => {
      const scroller = dataScroller.render();
      rootElement.appendChild(scroller);
    });
  };

  updateColumnSizes(columnSizes: Record<string, number>, zoom: number) {
    const columns = this.dataView.getColumns();

    for (const column of columns) {
      const columnId = column.id;

      const width = (columnSizes[columnId] || defaults.cell.width) * zoom;

      if (column.width !== width) {
        this.columnStateService.resize(columnId, width, ResizedBy.User);
      }
    }
  }

  setZoom = (zoom: number) => {
    // TODO: Make zoom instead of clearing
    this.rowService.setZoom(zoom);
    this.selectionService.clear();
    this.dataView.setZoom(zoom);
    this.rowNumberService.setZoom(zoom);
    this.header.setZoom(zoom);
  };

  setData = (data: GridData) => {
    this.dataService.setData(data);
  };

  setCell(col: number, row: number, cell: GridCell) {
    this.dataService.setCell(col, row, cell);
  }

  isTableHeader(col: number, row: number) {
    return this.dataService.isTableHeader(col, row);
  }

  isTableField(col: number, row: number) {
    return this.dataService.isTableField(col, row);
  }

  getCell(col: number, row: number) {
    return this.dataService.getCell(col, row);
  }

  getCellPosition = (col: number, row: number) => {
    return this.dataView.getCellPosition(col, row);
  };

  getCellByCoords = (x: number, y: number) => {
    return this.dataView.getCellByCoords(x, y);
  };

  setState = (colStates: IColumnState[]) => {
    this.columnStateService.setState(colStates);
  };

  setLoading = (isLoading: boolean) => this.dataService.setLoading(isLoading);

  setDataRowHeight = (rowHeight: number) => {
    this.rowService?.setDataRowHeight(rowHeight);
  };

  setHeaderRowHeight = (rowHeight: number) => {
    this.rowService?.setHeaderRowHeight(rowHeight);
  };

  setHeaderRowHeightByLevel = (rowHeights: number[]) => {
    this.rowService?.setHeaderRowHeightByLevel(rowHeights);
  };

  updateRowHeights = () => {
    this.rowService?.updateRowHeights();
  };

  clearSelection() {
    this.selectionService.clear();
  }

  updateSelectionAfterDataChange() {
    const selection = this.selection$.getValue();
    this.selectionService.setSelection(selection);
  }

  updateSelection(
    selection: GridSelection | null,
    moveMode = false,
    hideMoveTooltip = false
  ) {
    this.selectionService.setSelection(selection, moveMode, hideMoveTooltip);

    if (selection) {
      // setTimeout, to wait when rows and cols would be rendered and after that only change the viewport.
      // because if we change viewport before rows and cols would be rendered, we will get wrong viewport position
      // see dnd tables case
      setTimeout(() =>
        this.dataView.makeCellViewportVisible(
          selection.startCol,
          selection.startRow
        )
      );
    }
  }

  selectTableHeader(startCol: number, endCol: number) {
    this.selectionService.selectTableHeader(startCol, endCol);
  }

  isCellEditorOpen() {
    return isCellEditorOpen();
  }

  isTableHeaderSelected() {
    return this.selectionService.isTableHeaderSelected();
  }

  isCellEditorFocused() {
    return isCellEditorHasFocus();
  }

  hideCellEditor() {
    this.cellEditorService.hide();
  }

  showCellEditor(col: number, row: number, value: string) {
    this.cellEditorService.openExplicitly(col, row, value);
  }

  focusCellEditor() {
    this.cellEditorService.focus();
  }

  setCellEditorValue(value: string) {
    this.cellEditorService.setValue(value);
  }

  getCellDimensions(element: HTMLElement) {
    return this.selectionService.getCellDimensions(element);
  }

  destroy() {
    super.destroy();

    // We calling destroy on all services, because they are not fully destroyed by container
    const lookup = (this.container as any)._bindingDictionary.getMap() as Map<
      symbol,
      [{ cache: Destroyable }]
    >;
    lookup.forEach((service) => {
      if (!Array.isArray(service)) {
        service = [service];
      }
      for (const srv of service) {
        srv.cache?.destroy?.();
      }
    });
    this.container.unbindAll();
  }
}
