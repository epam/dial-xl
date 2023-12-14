import { inject, injectable } from 'inversify';
import isEqual from 'react-fast-compare';
import { takeUntil } from 'rxjs/operators';

import {
  COLUMN_STATE_SERVICE,
  CONFIG,
  DATA_SCROLLER,
  DATA_VIEW,
  Destroyable,
  ROW_SERVICE,
} from '@deltix/grid-it';
import type {
  GridItOptions,
  IColumnStateService,
  IDataScroller,
  IRowService,
} from '@deltix/grid-it-core';
import { appendChild, createElement } from '@deltix/grid-it-core';

import { rowNumberContainerClass } from '../../constants';
import { defaults } from '../../defaults';
import { getPx } from '../../utils';
import { DataView, GridData } from '../data';
import { IScroll } from '../data';
import type { GridSelection, ISelectionService } from '../selection';
import { SELECTION_SERVICE } from '../types';

import './rowNumber.scss';

const baseSymbolWidth = 8;
const padding = 10;

@injectable()
export class RowNumberService extends Destroyable {
  protected root: HTMLElement;
  protected stub: HTMLElement;
  protected currentCell: { col: number; row: number } | null;

  protected selectionStartRow: number | undefined;
  protected selectionEndRow: number | undefined;
  protected state: HTMLElement[] = [];

  protected scrollTop: number;
  protected selection: GridSelection | null;

  protected rafId = 0;
  protected zoom: number;
  protected width: number;

  constructor(
    @inject(DATA_VIEW)
    protected dataView: DataView,
    @inject(COLUMN_STATE_SERVICE)
    protected columnStateService: IColumnStateService,
    @inject(DATA_SCROLLER) protected scroller: IDataScroller,
    @inject(CONFIG) protected config: GridItOptions<GridData>,
    @inject(ROW_SERVICE) protected rowService: IRowService,
    @inject(SELECTION_SERVICE) protected selectionService: ISelectionService
  ) {
    super();

    this.currentCell = null;

    this.root = createElement('div', {
      classList: [rowNumberContainerClass],
    });

    this.stub = createElement('div', {
      classList: ['grid-pinned-row-number-stub'],
    });

    appendChild(this.root, this.stub);

    this.rafId = 0;
    this.zoom = 1;

    this.width = baseSymbolWidth * this.zoom + padding;
    const width = getPx(this.width);

    this.root.style.width = width;
    this.stub.style.width = width;

    this.scroller.render().appendChild(this.root);

    this.scrollTop = 0;
    this.selection = null;

    this.dataView.scroll$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ scrollTop }: IScroll) => {
        this.scrollTop = scrollTop;

        if (this.rafId) {
          cancelAnimationFrame(this.rafId);
        }
        this.rafId = requestAnimationFrame(() => this.renderRowNumbers());
      });

    this.selectionService.selection$
      .pipe(takeUntil(this.destroy$))
      .subscribe((selection) => {
        if (isEqual(this.selection, selection)) return;

        this.selection = selection;

        if (this.rafId) cancelAnimationFrame(this.rafId);

        this.rafId = requestAnimationFrame(() => this.renderRowNumbers());
      });
  }

  setZoom(zoom: number) {
    this.zoom = zoom;
    this.renderRowNumbers();

    // TODO: Add dynamic allocation
    // this.stub.style.width = `${defaults.rowNumber.stub.width * zoom}px`;
    this.stub.style.height = `${defaults.rowNumber.stub.height * zoom}px`;
  }

  protected createRowNumberElement() {
    const element = document.createElement('div');

    element.style.position = 'absolute';
    element.classList.add('grid-row-number');

    return element;
  }

  protected renderRowNumbers() {
    const [startRow, endRow] = this.dataView.edges;

    const rowsCount = endRow - startRow + 1;

    while (this.root.lastElementChild && this.state.length > rowsCount) {
      this.root.removeChild(this.root.lastElementChild);
      this.state.pop();
    }

    let maxRow = 0;

    for (let index = 0; index < rowsCount; ++index) {
      if (index >= this.state.length) {
        const element = this.createRowNumberElement();

        this.root.appendChild(element);
        this.state.push(element);
      }

      const element = this.state[index];

      const row = startRow + index;
      maxRow = Math.max(maxRow, row);

      const top =
        this.dataView.getState(row).top * this.zoom +
        defaults.cell.height * this.zoom;

      element.title = `${row}`;
      element.classList.remove('grid-row-number--selected');

      if (this.selection) {
        const { startRow, endRow } = this.selection;

        if (
          (startRow <= row && row <= endRow) ||
          (endRow <= row && row <= startRow)
        ) {
          element.classList.add('grid-row-number--selected');
        }
      }

      element.innerHTML = `${row}`;
      element.style.transform = `translate(0, ${top - this.scrollTop}px)`;
    }

    this.width =
      maxRow.toString().length * baseSymbolWidth * this.zoom + padding;
    const width = getPx(this.width);
    this.root.style.width = width;
    this.stub.style.width = width;
    this.dataView.emitRowNumberResize(this.width);
  }

  getWidth() {
    return this.width;
  }

  destroy() {
    this.root.remove();
    super.destroy();
  }

  protected reset = () => {
    this.columnStateService.reset();
  };
}
