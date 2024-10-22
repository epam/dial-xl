import { Container, inject, injectable } from 'inversify';
import { combineLatest, fromEvent, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  COLUMN_STATE_SERVICE,
  CONFIG,
  Destroyable,
  EVENTS_SERVICE,
  ROW_SERVICE,
} from '@deltix/grid-it';
import type { GridItOptions, IColumnStateService } from '@deltix/grid-it-core';
import {
  appendChild,
  Column,
  createElement,
  PinnedPosition,
  PinnedPositionsMap,
  ResizedBy,
} from '@deltix/grid-it-core';

import type { IEventsService } from '../events';
import { GridEvent } from '../events/types';
import type { IRowService } from '../row';
import type { ISelectionService } from '../selection';
import { SELECTION_SERVICE } from '../types';

const stubSize = 3;
const dblClickDelay = 300;

/**
 * This service is legacy
 */
@injectable()
export class HeaderCell<T> extends Destroyable {
  protected root: HTMLElement;
  protected column!: Column;
  protected content: HTMLElement;
  protected resize!: HTMLElement;
  protected resizeStub: HTMLElement;

  protected level!: number;

  protected mouseMoveSub!: Subscription;
  protected mouseUpSub!: Subscription;

  protected pinnedPositionsMap!: PinnedPositionsMap;

  protected lastTs = 0;

  protected start = {
    clientX: 0,
    width: 0,
  };

  constructor(
    @inject(Container) protected container: Container,
    @inject(CONFIG) protected config: GridItOptions<T>,
    @inject(COLUMN_STATE_SERVICE)
    protected columnStateService: IColumnStateService,
    @inject(ROW_SERVICE) protected rowService: IRowService,
    @inject(EVENTS_SERVICE) protected eventService: IEventsService,
    @inject(SELECTION_SERVICE) protected selectionService: ISelectionService
  ) {
    super();

    this.content = createElement('div', {
      classList: ['grid-header-cell__content'],
    });
    this.root = createElement(
      'div',
      {
        classList: ['grid-header-cell'],
      },
      this.content
    );

    this.resizeStub = createElement('div', {
      classList: ['grid-header-cell__resize-stub'],
    });

    combineLatest([
      this.rowService.headerRowHeight$,
      this.rowService.headerRowHeightByLevel$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateHeight());

    if (this.config?.resize !== false) {
      this.resize = createElement('div', {
        classList: ['grid-header-cell__resize'],
        draggable: false,
      });

      fromEvent(this.resize, 'mousedown', { passive: true })
        .pipe(takeUntil(this.destroy$))
        .subscribe((e) => this.startResize(e as MouseEvent));
    }

    this.selectionService.selection$
      .pipe(takeUntil(this.destroy$))
      .subscribe((selection) => {
        if (!selection || !this.column) {
          this.root.classList.remove('grid-header-cell--selected');

          return;
        }
        const col = +this.column.id;

        const selectedPinnedCols =
          this.selectionService.getSelectedPinnedCols();

        if (!selectedPinnedCols) {
          this.root.classList.remove('grid-header-cell--selected');

          return;
        }

        const { startCol, endCol } = selectedPinnedCols;

        if (
          (startCol <= col && col <= endCol) ||
          (endCol <= col && col <= startCol)
        ) {
          this.root.classList.add('grid-header-cell--selected');

          return;
        }

        this.root.classList.remove('grid-header-cell--selected');
      });
  }

  private processPinState = () => {
    if (!this.column || !this.pinnedPositionsMap) {
      return;
    }

    this.processPinnedPosition(this.pinnedPositionsMap[this.column.id]);
  };

  private processPinnedPosition = (
    pinnedPosition: PinnedPosition | undefined
  ) => {};

  setColumn(col: Column, zoom: number) {
    this.column = col;

    appendChild(this.root, this.resize);

    this.root.style.width = `${col.width}px`;
    this.content.innerText = col.title;

    this.processPinState();
  }

  private updateHeight = () => {
    if ('number' !== typeof this.level) {
      return;
    }

    const px = this.rowService.getHeaderRowHeight(this.level);

    if (!px) {
      this.root.style.height = `auto`;
    } else {
      this.root.style.height = `${px}px`;
    }
  };

  getHeaderContainer(): HTMLElement {
    return this.root.parentElement as HTMLElement;
  }

  render(): HTMLElement {
    return this.root;
  }

  destroy() {
    this.stopResize();
    super.destroy();
    this.root.remove();
  }

  protected startResize = (e: MouseEvent) => {
    this.start.clientX = e.clientX;
    this.start.width = this.column.width;

    if (e.timeStamp - this.lastTs < dblClickDelay) {
      this.eventService.emit({
        type: GridEvent.columnResizeDbClick,
        column: parseInt(this.column.id, 10),
      });

      this.lastTs = e.timeStamp;

      return;
    }

    this.lastTs = e.timeStamp;

    document.body.style.cursor = 'col-resize';
    document.body.style.pointerEvents = 'none';
    this.resize.classList.add('grid-header-cell__resize--active');

    const container = this.getHeaderContainer().getBoundingClientRect();
    this.resizeStub.style.left = `${e.clientX - container.left - stubSize}px`;

    appendChild(this.getHeaderContainer(), this.resizeStub);

    this.mouseMoveSub = fromEvent(window, 'mousemove', { passive: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => this.onResize(e as MouseEvent));

    this.mouseUpSub = fromEvent(window, 'mouseup', { passive: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => this.stopResize(e as MouseEvent));
  };

  protected stopResize = (e?: MouseEvent) => {
    document.body.style.cursor = 'default';
    document.body.style.pointerEvents = 'auto';

    if (
      this.getHeaderContainer().querySelector('.grid-header-cell__resize-stub')
    ) {
      this.getHeaderContainer().removeChild(this.resizeStub);
    }

    this.resize.classList.remove('grid-header-cell__resize--active');

    if (!e) {
      this.mouseUpSub?.unsubscribe();
      this.mouseMoveSub?.unsubscribe();

      return;
    }

    const diff = e.clientX - this.start.clientX;
    const width = diff + this.start.width;

    this.columnStateService.resize(this.column.id, width, ResizedBy.User);
    this.eventService.emit({
      type: GridEvent.columnResize,
      column: parseInt(this.column.id, 10),
      width,
    });

    this.mouseUpSub?.unsubscribe();
    this.mouseMoveSub?.unsubscribe();
  };

  protected onResize = (e: MouseEvent) => {
    const diff = e.clientX - this.start.clientX;
    let width = diff + this.start.width;

    const container = this.getHeaderContainer().getBoundingClientRect();

    this.resizeStub.style.left = `${e.clientX - container.left - stubSize}px`;

    if (
      'number' === typeof this.column.options.maxWidth &&
      width > this.column.options.maxWidth
    ) {
      width = this.column.options.maxWidth;
    }

    if (
      'number' === typeof this.column.options.minWidth &&
      width < this.column.options.minWidth
    ) {
      width = this.column.options.minWidth;
    }
  };
}
