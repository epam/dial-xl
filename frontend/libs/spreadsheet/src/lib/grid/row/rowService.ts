import { inject, injectable, postConstruct } from 'inversify';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { COLUMN_SERVICE, CONFIG, Destroyable } from '@deltix/grid-it';
import type {
  GridItOptionsInternal,
  IColumnService,
  IRowService,
} from '@deltix/grid-it-core';
import {
  DEFAULT_HEADER_ROW_HEIGHT,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_ROW_HEIGHT_BY_LEVEL,
} from '@deltix/grid-it-core';

import { calculateRowWidth } from '../utils';

const getWarnMessage = (type: string, height: number) =>
  `Ignored attempt to set ${type} row height to ${height}px. Height should be >0`;
@injectable()
export class RowService extends Destroyable implements IRowService {
  protected widthWithClones = new BehaviorSubject(0);
  protected widthNoClones = new BehaviorSubject(0);
  protected dataRowHeight = new BehaviorSubject(DEFAULT_ROW_HEIGHT);
  protected headerRowHeight = new BehaviorSubject(DEFAULT_HEADER_ROW_HEIGHT);
  protected headerRowHeightByLevel = new BehaviorSubject<number[]>(
    DEFAULT_ROW_HEIGHT_BY_LEVEL
  );
  protected zoom: number;
  protected forceDataRowHeightUpdate = new Subject();
  get widthWithClones$() {
    return this.widthWithClones.asObservable();
  }
  get widthNoClones$() {
    return this.widthNoClones.asObservable();
  }
  get dataRowHeight$() {
    return this.dataRowHeight.asObservable();
  }
  get headerRowHeight$() {
    return this.headerRowHeight.asObservable();
  }
  get headerRowHeightByLevel$() {
    return this.headerRowHeightByLevel.asObservable();
  }
  get forceDataRowHeightUpdate$() {
    return this.forceDataRowHeightUpdate.asObservable();
  }
  constructor(
    @inject(COLUMN_SERVICE)
    protected columnService: IColumnService,
    @inject(CONFIG) protected options: GridItOptionsInternal
  ) {
    super();

    this.zoom = 1;

    if ('number' === typeof options?.headerRowHeight) {
      this.setHeaderRowHeight(options.headerRowHeight);
    }
    if ('number' === typeof options?.dataRowHeight) {
      this.setDataRowHeight(options.dataRowHeight);
    }
    if (Array.isArray(options?.headerRowHeightByLevel)) {
      this.setHeaderRowHeightByLevel(options.headerRowHeightByLevel);
    }
  }
  destroy() {
    this.widthNoClones.complete();
    this.widthWithClones.complete();
    this.dataRowHeight.complete();
    this.headerRowHeight.complete();
    super.destroy();
  }
  @postConstruct()
  protected subscribe() {
    this.columnService.flat$
      .pipe(takeUntil(this.destroy$))
      .subscribe((flat) => {
        this.widthWithClones.next(calculateRowWidth(flat, true));
        this.widthNoClones.next(calculateRowWidth(flat, false));
      });
  }
  public setHeaderRowHeight = (height: number) => {
    if (this.isInvalidRowHeight(height)) {
      // eslint-disable-next-line no-console
      console.warn(getWarnMessage('header', height));

      return;
    }
    this.headerRowHeight.next(height);
  };

  public setZoom = (zoom: number) => {
    this.zoom = zoom;
  };

  public getZoom = () => this.zoom;

  public setHeaderRowHeightByLevel = (heights: number[]) => {
    const invalidIndex = heights.findIndex(this.isInvalidRowHeight);
    const foundError = -1 !== invalidIndex;
    if (foundError) {
      const invalidHeight = heights[invalidIndex];
      const warning = getWarnMessage('header', invalidHeight);
      // eslint-disable-next-line no-console
      console.warn(warning);

      return;
    }
    this.headerRowHeightByLevel.next(heights);
  };

  public setDataRowHeight = (height: number) => {
    if (this.isInvalidRowHeight(height)) {
      // eslint-disable-next-line no-console
      console.warn(getWarnMessage('data', height));

      return;
    }
    this.dataRowHeight.next(height);
  };
  public getHeaderRowHeight = (level: number) => {
    if ('number' === typeof this.headerRowHeightByLevel.value[level]) {
      return this.headerRowHeightByLevel.value[level];
    }

    return this.headerRowHeight.value;
  };
  isInvalidRowHeight = (height: number) => height < 0;
  updateRowHeights() {
    this.forceDataRowHeightUpdate.next(Date.now());
  }
}
