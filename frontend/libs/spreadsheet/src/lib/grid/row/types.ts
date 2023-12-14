import { Observable } from 'rxjs';

export type IRowService = {
  widthWithClones$: Observable<number>;
  widthNoClones$: Observable<number>;
  dataRowHeight$: Observable<number>;
  headerRowHeight$: Observable<number>;
  headerRowHeightByLevel$: Observable<number[]>;
  forceDataRowHeightUpdate$: Observable<unknown>;
  setDataRowHeight: (height: number) => void;
  setHeaderRowHeight: (height: number) => void;
  setHeaderRowHeightByLevel: (heights: number[]) => void;
  getHeaderRowHeight: (level: number) => number;
  updateRowHeights: () => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
};
