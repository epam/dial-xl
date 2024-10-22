import { Container } from 'inversify';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, first, skip, take, withLatestFrom } from 'rxjs/operators';

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
import { GridCell, GridData } from '@frontend/common';

import { gridRoot } from '../constants';
import { defaults } from '../defaults';
import { isCellEditorHasFocus, isCellEditorOpen } from '../utils';
import {
  GridCellEditorEvent,
  GridCellEditorEventInsertValue,
  ICellEditorService,
} from './cellEditor';
import { DataView, IDataService, IRowNumberResize, IScroll } from './data';
import { EventType, IEventsService } from './events';
import { IHeader } from './header';
import { initContainer } from './initContainer';
import { IRowService } from './row';
import { IRowNumberService } from './rowNumber';
import {
  GridSelection,
  GridSelectionEvent,
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

/**
 * Grid is a main class that encapsulates logic from grid services, contains DI Container to make relationship between services
 * @property {Container} container - DI Container where Grid Services placed.
 * @property {GridItOptionsInternal<GridData>} options - Grid configuration provided by creation. These options can be used in different services to achieve specific behavior.
 * @property {IColumnService} columnService - Service responsible for operations with columns (like grouping, tree view, flatting, etc.)
 * @property {IColumnStateService} columnStateService Service responsible for state of columns (encapsulates column state calculating from columnService, contains resizing, visibility, etc.)
 * @property {DataView} dataView - !!!MAIN SERVICE!!! that responsible for rendering rows (contains scroll handling, virtualization, position calculating, etc)
 * @property {IDataService} dataService Service responsible for data (application provides data to grid, dataService encapsulates direct access to data, has useful methods related to data)
 * @property {IRowService} rowService Service responsible for row related calculations (like height of header row, this service is legacy from initial grid version)
 * @property {ISelectionService} selectionService Service responsible for selection (like rendering, position calculation, shortcuts handling, etc.)
 * @property {IRowNumberService} rowNumberService Service responsible for rendering row number (first column before grid, like 0, 1, 2, 3, ...)
 * @property {ICellEditorService} cellEditorService Service responsible for providing events to CellEditor (open, hiding, focusing)
 * @property {IHeader} header Service pretty similar responsibility like a rowNumber, contains legacy from initial version of grid (rendering headers of columns at the top of the grid)
 */
export class Grid extends Destroyable {
  private container: Container;

  private options: GridItOptionsInternal<GridData>;

  private columnService: IColumnService;
  private columnStateService: IColumnStateService;

  private dataView: DataView;
  private dataService: IDataService;

  private rowService: IRowService;
  private rowNumberService: IRowNumberService;

  private selectionService: ISelectionService;

  private cellEditorService: ICellEditorService;

  private header: IHeader;

  private _isPointClickMode: boolean;

  /**
   * Getter for observable with grid events (for example: row click, context menu, open note, etc.)
   * @returns {Observable<EventType>} Observable with grid events
   */
  get events$(): Observable<EventType> {
    return this.container.get<IEventsService>(EVENTS_SERVICE).events$;
  }

  /**
   * Getter for EventsService, needed for emitting grid event from outside
   * @returns {IEventsService} EventsService
   */
  get event(): IEventsService {
    return this.container.get<IEventsService>(EVENTS_SERVICE);
  }

  /**
   * Getter for current selection
   * @returns {GridSelection | null} Selection
   */
  get selection(): GridSelection | null {
    return this.selectionService.selection;
  }

  /**
   * Getter for observable which trigger action every time when selection changes
   * @returns {BehaviorSubject<GridSelection | null>} Selection observable
   */
  get selection$(): BehaviorSubject<GridSelection | null> {
    return this.selectionService.selection$;
  }

  getSelection(): GridSelection | null {
    return this.selection$.getValue();
  }

  /**
   * Getter for observable which trigger action every time when scroll changes
   * @returns {Observable<IScroll>} Scroll observable
   */
  get scroll$(): Observable<IScroll> {
    return this.dataView.scroll$;
  }

  /**
   * Getter for observable which trigger action every time when rowNumber column resized (in width, when row number getting bigger)
   * @returns {Observable<IRowNumberResize>} RowNumberResize observable
   */
  get rowNumberResize$(): Observable<IRowNumberResize> {
    return this.dataView.rowNumberResize$;
  }

  /**
   * Getter for observable which trigger action every time when shortcut was pressed (shortcuts that related with grid selection, for example: extend selection up, select all table, etc.)
   * @returns {Observable<GridSelectionShortcut>} Selection shortcut observable
   */
  get selectionShortcuts$(): Observable<GridSelectionShortcut> {
    return this.selectionService.shortcuts$.asObservable();
  }

  /**
   * Getter for observable which trigger action every time when cell editor event happens (open, hide, focus)
   * @returns {Subject<GridCellEditorEvent>} Cell Editor event observable
   */
  get cellEditorEvent$(): Subject<GridCellEditorEvent> {
    return this.cellEditorService.cellEditorEvents$;
  }

  /**
   * Getter for first and last visible row in viewport
   * @returns {[number, number]} [firstVisibleRow, lastVisibleRow]
   */
  get rowEdges(): [number, number] {
    return this.dataView.edges;
  }

  /**
   * Getter for first and last visible column in viewport
   * @returns {[number, number]} [firstVisibleColumn, lastVisibleColumn]
   */
  get colEdges(): [number, number] {
    return this.dataView.columnsEdges;
  }

  /**
   * Getter for selection events (like start moving selection, stop moving selection, check CTRL + A for table case in selectionService)
   * @returns {[number, number]} [firstVisibleColumn, lastVisibleColumn]
   */
  get selectionEvents$(): Observable<GridSelectionEvent> {
    return this.selectionService.selectionEvents$;
  }

  /**
   * @param rootElement {HTMLElement} HTML container to which grid should be placed
   * @param options {GridItOptions<GridData>} Grid configuration
   */
  constructor(rootElement: HTMLElement, options: GridItOptions<GridData>) {
    super();

    this.options = prepareInternalOptions<GridData>(options, rootElement);

    // All service relation inside method initContainer
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

    this._isPointClickMode = false;

    this.mount(rootElement);

    // initialize common
    if (this.container.isBound(COMMON_COMPONENT)) {
      this.container.getAll(COMMON_COMPONENT);
    }
  }

  /**
   * Method which appends scroller div (that described inside dataView) to rootElement
   * @param rootElement {HTMLElement} Reference to element where scroller div should be placed
   */
  private mount = (rootElement: HTMLElement): void => {
    rootElement.classList.add(gridRoot);

    const dataScroller = this.container.get<IDataScroller>(DATA_SCROLLER);

    this.columnService.flat$.pipe(first()).subscribe(() => {
      const scroller = dataScroller.render();
      rootElement.appendChild(scroller);
    });
  };

  /**
   * Sends shortcut event to selection service, needed in cases of external selection move using native ways (for example: enter navigation inside cellEditor)
   * @param event {GridSelectionShortcut} Grid selection shortcut event
   */
  public sendSelectionEvent(event: GridSelectionShortcut): void {
    this.selectionService.shortcuts$.next(event);
  }

  /**
   * Method for passing the keyboard event to selectionService.
   * @param event {KeyboardEvent} js keyboard event
   */
  public selectionOnKeyDown(event: KeyboardEvent): void {
    this.selectionService.onKeyDown(event);
  }

  /**
   * Update column widths, needed for external column size change, triggers columnStateService resize action
   * @param columnSizes {Record<string, number>} External column sizes (that could be loaded from localStorage of host application)
   * @param zoom {number} Host application zoom value
   */
  public updateColumnSizes(
    columnSizes: Record<string, number>,
    zoom: number
  ): void {
    const columns = this.dataView.getColumns();

    for (const column of columns) {
      const columnId = column.id;

      const width = (columnSizes[columnId] || defaults.cell.width) * zoom;

      if (column.width !== width) {
        this.columnStateService.resize(columnId, width, ResizedBy.User);
      }
    }
  }

  /**
   * Updates zoom in all services (needed for sizes recalculation)
   * @param zoom {number} Application zoom
   */
  public setZoom = (zoom: number): void => {
    // TODO: Make zoom instead of clearing
    this.rowService.setZoom(zoom);
    this.selectionService.clear();
    this.dataView.setZoom(zoom);
    this.rowNumberService.setZoom(zoom);
    this.header.setZoom(zoom);
  };

  /**
   * Provides data to data service
   * @param data {GridData} Host application data for grid
   */
  public setData = (data: GridData): void => {
    this.dataService.setData(data);
  };

  /**
   * Changes cell by provided row and col
   * @param col {number} grid column
   * @param row {number} grid row
   * @param cell {GridCell} cell domain-specific information
   */
  public setCell(col: number, row: number, cell: GridCell): void {
    this.dataService.setCell(col, row, cell);
  }

  /**
   * Checks is cell - table header by provided column and row
   * @param col {number} grid column
   * @param row {number} grid row
   * @returns {boolean} is table header or not
   */
  public isTableHeader(col: number, row: number): boolean {
    return this.dataService.isTableHeader(col, row);
  }

  /**
   * Checks is cell - table field by provided column and row
   * @param col {number} grid column
   * @param row {number} grid row
   * @returns {boolean} is table header or not
   */
  public isTableField(col: number, row: number): boolean {
    return this.dataService.isTableField(col, row);
  }

  /**
   * Returns cell information by provided column and row
   * @param col {number} grid column
   * @param row {number} grid row
   * @returns {GridCell | undefined} grid data cell
   */
  public getCell(col: number, row: number): GridCell | undefined {
    return this.dataService.getCell(col, row);
  }

  /**
   * Returns col and row of next cell
   *
   * @public
   * @param {{
   *     col: number;
   *     row: number;
   *     colDirection?: 'left' | 'right';
   *     rowDirection?: 'top' | 'bottom';
   *   }} params
   * @param {number} params.col
   * @param {number} params.row
   * @param {("left" | "right")} params.colDirection col next direction
   * @param {("top" | "bottom")} params.rowDirection row next direction
   * @returns {{ col: number; row: number; }}
   */
  public getNextCell(params: {
    col: number;
    row: number;
    colDirection?: 'left' | 'right';
    rowDirection?: 'top' | 'bottom';
  }): { col: number; row: number } {
    return this.dataService.getNextCell(params);
  }

  /**
   * Returns cell position relative to viewport
   * @param col {number} grid column
   * @param row {number} grid row
   * @returns {x: number, y: number} position of given cell
   */
  public getCellPosition = (
    col: number,
    row: number
  ): { x: number; y: number } => {
    return this.dataView.getCellPosition(col, row);
  };

  /**
   * Return cell(col, row) of given x, y coordinates, opposite of getCellPosition
   * @param x {number} x coordinate
   * @param y {number} y coordinate
   * @returns {col: number, row: number} column and row of cell by given coordinates
   */
  public getCellByCoords = (
    x: number,
    y: number
  ): { col: number; row: number } => {
    return this.dataView.getCellByCoords(x, y);
  };

  /**
   * External setting column state from host application
   * @param colStates {IColumnState[]} new column state
   */
  public setState = (colStates: IColumnState[]): void => {
    this.columnStateService.setState(colStates);
  };

  /**
   * Change loading state
   * @param isLoading {boolean} new loading state
   */
  public setLoading = (isLoading: boolean) =>
    this.dataService.setLoading(isLoading);

  /**
   * Clears selection (resets coordinates, hides)
   */
  public clearSelection(): void {
    this.selectionService.clear();
  }

  /**
   * Selected depends from data, if data change we should update the selection
   */
  public updateSelectionAfterDataChange(): void {
    const selection = this.selection$.getValue();
    this.selectionService.setSelection(selection);
  }

  /**
   * External update of selection, check useSelectionEvents
   * @param selection {GridSelection | null} new selection
   * @param moveMode {boolean = false} selection in move mode (when we do ctrl + a, we're moving range selection using arrows)
   * @param hideMoveTooltip {boolean = false} not in all cases needed showing tooltip with arrows ("<^>"), for example drag'n'drop tables
   * @param mouseCol {number | undefined} column which currently mouse looking at
   * @param mouseRow {number | undefined} row which currently mouse looking at
   */
  public updateSelectionAfterDataChanged(
    selection: GridSelection | null,
    moveMode: boolean | undefined = false,
    hideMoveTooltip: boolean | undefined = false,
    mouseCol?: number,
    mouseRow?: number
  ): void {
    this.dataService.data$
      .pipe(
        withLatestFrom(this.dataService.loading$),
        filter(([gridData, val]) => !val && !!gridData),
        skip(1), // Skip current value and wait for new
        take(1)
      )
      .subscribe(() =>
        this.updateSelection(
          selection,
          moveMode,
          hideMoveTooltip,
          mouseCol,
          mouseRow
        )
      );
  }

  public updateDottedSelectionAfterDataChanged(
    selection: GridSelection | null
  ): void {
    this.dataService.data$
      .pipe(
        withLatestFrom(this.dataService.loading$),
        filter(([gridData, val]) => !val && !!gridData),
        take(1)
      )
      .subscribe(() => {
        if (selection) {
          this.showDottedSelection(selection);
        }
      });
  }

  /**
   * External update of selection, check useSelectionEvents
   * @param selection {GridSelection | null} new selection
   * @param moveMode {boolean = false} selection in move mode (when we do ctrl + a, we're moving range selection using arrows)
   * @param hideMoveTooltip {boolean = false} not in all cases needed showing tooltip with arrows ("<^>"), for example drag'n'drop tables
   * @param mouseCol {number | undefined} column which currently mouse looking at
   * @param mouseRow {number | undefined} row which currently mouse looking at
   */
  public updateSelection(
    selection: GridSelection | null,
    moveMode: boolean | undefined = false,
    hideMoveTooltip: boolean | undefined = false,
    mouseCol?: number,
    mouseRow?: number
  ): void {
    this.selectionService.setSelection(selection, moveMode, hideMoveTooltip);

    if (selection) {
      // setTimeout, to wait when rows and cols would be rendered and after that only change the viewport.
      // because if we change viewport before rows and cols would be rendered, we will get wrong viewport position
      // see dnd tables case
      setTimeout(() => {
        const col = mouseCol === undefined ? selection.startCol : mouseCol;
        const row = mouseRow === undefined ? selection.startRow : mouseRow;

        this.dataView.makeCellViewportVisible(col, row);
      });
    }
  }

  public showDottedSelection(selection: GridSelection) {
    this.selectionService.showDottedSelection(selection);
  }

  public hideDottedSelection() {
    this.selectionService.hideDottedSelection();
  }

  /**
   * Reset grid scroll to position 0, 0; needed in cases of sheet changing - we should reset viewport
   */
  clearViewportScroll(): void {
    this.dataView.clearViewportScroll();
  }

  /**
   * If cell editor open
   */
  public isCellEditorOpen(): boolean {
    return isCellEditorOpen();
  }

  /**
   * If application focus is in cell editor
   */
  public isCellEditorFocused(): boolean {
    return isCellEditorHasFocus();
  }

  /**
   * Set value after point click in cell editor
   * @param value {string} point click value
   */
  public setPointClickValue(value: string): void {
    this.cellEditorService.setPointClickValue(value);
  }

  /**
   * Set or remove error after point click in cell editor
   * @param isError {boolean} is error
   */
  public setPointClickError(isError: boolean): void {
    this.selectionService.setPointClickError(isError);
  }

  /**
   * Hides cell editor
   */
  public hideCellEditor(): void {
    this.cellEditorService.hide();
  }

  /**
   * Shows cell editor
   * @param col {number} column where cell editor should be placed
   * @param row {number} row where cell editor should be placed
   * @param value {string} value should be in cell editor when it will be opened (for example: when we click on rename of field, we want to see previous fieldName at once)
   * @param options.dimFieldName {string} dimension field name (needed in cases of editing dimension field from formula bar)
   * @param options.withFocus {boolean} set focus when opened cell editor
   */
  public showCellEditor(
    col: number,
    row: number,
    value: string,
    options?: {
      dimFieldName?: string;
      withFocus?: boolean;
    }
  ): void {
    this.cellEditorService.openExplicitly(col, row, value, options);
  }

  /**
   * Sets application focus to opened cell editor
   */
  public focusCellEditor(): void {
    this.cellEditorService.focus();
  }

  /**
   * External set of value in cell editor
   * @param value {string} value should be in cell editor
   */
  public setCellEditorValue(value: string) {
    this.cellEditorService.setValue(value);
  }

  /**
   * External set of value in cell editor
   * @param value {string} value should be in cell editor
   * @param options.valueCursorOffset {string} used when we need to set cursor to some place inside of added value after inserting it
   */
  public insertCellEditorValue(
    value: string,
    options?: GridCellEditorEventInsertValue['options']
  ) {
    this.cellEditorService.insertValue(value, options);
  }

  /**
   * Checks if got event target is a cell of the grid and not resize
   * @param target {EventTarget} specified event target
   * @returns {boolean} is target a cell
   */
  public isTargetCell(target: EventTarget | null): boolean {
    return this.selectionService.isTargetCell(target);
  }

  public getColumnContentMaxSymbols(
    col: number,
    viewportStartRow: number,
    viewportEndRow: number
  ) {
    let max = 0;

    for (let row = viewportStartRow; row < viewportEndRow; row++) {
      const cell = this.getCell(row, col);

      max = Math.max(max, cell?.value?.length || 0);
    }

    return max;
  }

  /**
   * Switches point click mode
   * @param isPointClickMode flag to set mode
   */
  public setIsPointClickMode(isPointClickMode: boolean) {
    this._isPointClickMode = isPointClickMode;

    this.selectionService.switchPointClickMode(isPointClickMode);
  }

  /**
   * Getter for point click mode
   * @returns {boolean} is point click mode
   */
  get isPointClickMode() {
    return this._isPointClickMode;
  }

  /**
   * Destroys grid
   */
  destroy() {
    super.destroy();

    // We're calling destroy on all services, because they are not fully destroyed by container
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
