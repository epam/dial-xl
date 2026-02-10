import { Observable, Subject } from 'rxjs';

import {
  CellPlacement,
  ChartType,
  FieldSortOrder,
  GPTFocusColumn,
  GPTSuggestion,
  GridFilterType,
  TableArrangeType,
} from '@frontend/common';
import { ControlType, OverrideValue, TotalType } from '@frontend/parser';

import { GridCellEditorMode } from '../components';
import {
  GridCell,
  HorizontalDirection,
  SelectionEdges,
  ViewportEdges,
} from '../types';

type SelectionEvent =
  | { type: 'selection/changed'; payload: SelectionEdges | null }
  | { type: 'selection/point-click-started' }
  | { type: 'selection/point-click-stopped' }
  | {
      type: 'selection/point-click-value-picked';
      payload: SelectionEdges | null;
    }
  | { type: 'selection/delete' };

type ViewportEvent =
  | { type: 'viewport/scrolled'; payload: ViewportEdges }
  | { type: 'viewport/expand' };

type EditorEvent =
  | {
      type: 'editor/submit';
      payload: {
        editMode: GridCellEditorMode;
        currentCell: CellPlacement;
        cell: GridCell | undefined;
        value: string;
        dimFieldName?: string;
        openStatusModal?: (text: string) => void;
      };
      reply: (shouldHide: boolean) => void;
    }
  | { type: 'editor/mode-changed'; payload: GridCellEditorMode }
  | {
      type: 'editor/value-updated';
      payload: { value: string; cancelEdit: boolean; dimFieldName?: string };
    };

type ChartsEvent =
  | {
      type: 'charts/resize';
      payload: { tableName: string; cols: number; rows: number };
    }
  | {
      type: 'charts/select-key';
      payload: {
        tableName: string;
        fieldName: string;
        key: string | string[];
        isNoDataKey?: boolean;
      };
    }
  | {
      type: 'charts/get-keys';
      payload: { tableName: string; fieldName: string };
    }
  | { type: 'charts/add'; payload: { tableName: string; chartType: ChartType } }
  | {
      type: 'charts/insert';
      payload: {
        tableName: string;
        chartType: ChartType;
        col: number;
        row: number;
      };
    }
  | { type: 'charts/dblclick' };

type ClipboardEvent = {
  type: 'clipboard/paste';
  payload: { cells: string[][] };
};

type TablesEvent =
  | { type: 'tables/delete'; payload: { tableName: string } }
  | { type: 'tables/rename'; payload: { oldName: string; newName: string } }
  | {
      type: 'tables/move';
      payload: { tableName: string; rowDelta: number; colDelta: number };
    }
  | { type: 'tables/clone'; payload: { tableName: string } }
  | { type: 'tables/flip'; payload: { tableName: string } }
  | {
      type: 'tables/dnd';
      payload: { tableName: string; row: number; col: number };
    }
  | {
      type: 'tables/toggle-title-or-header-visibility';
      payload: { tableName: string; toggleTableHeader: boolean };
    }
  | {
      type: 'tables/add-row';
      payload: { col: number; row: number; tableName: string; value: string };
    }
  | {
      type: 'tables/add-row-to-end';
      payload: { tableName: string; value: string };
    }
  | {
      type: 'tables/promote-row';
      payload: { tableName: string; dataIndex: number };
    }
  | {
      type: 'tables/arrange';
      payload: { tableName: string; arrangeType: TableArrangeType };
    }
  | {
      type: 'tables/download';
      payload: { tableName: string };
    }
  | {
      type: 'tables/switch-input';
      payload: { tableName: string; fieldName: string };
    }
  | {
      type: 'tables/sync-single-import-field';
      payload: { tableName: string; fieldName: string };
    }
  | {
      type: 'fields/ai-regenerate';
      payload: { tableName: string; fieldName: string };
    }
  | {
      type: 'tables/create-action';
      payload: {
        action: string;
        type: string | undefined;
        insertFormula: string | undefined;
        tableName: string | undefined;
      };
    }
  | {
      type: 'tables/change-description';
      payload: {
        tableName: string;
        fieldName: string;
        descriptionFieldName: string;
        isRemove?: boolean;
      };
    }
  | { type: 'tables/create-derived'; payload: { tableName: string } }
  | {
      type: 'tables/create-manual';
      payload: {
        col: number;
        row: number;
        cells: string[][];
        hideTableHeader?: boolean;
        hideFieldHeader?: boolean;
        customTableName?: string;
      };
    }
  | {
      type: 'tables/expand-dim';
      payload: {
        tableName: string;
        fieldName: string;
        col: number;
        row: number;
      };
    }
  | {
      type: 'tables/show-row-ref';
      payload: {
        tableName: string;
        fieldName: string;
        col: number;
        row: number;
      };
    }
  | { type: 'tables/convert-to-table'; payload: { tableName: string } }
  | {
      type: 'tables/convert-to-chart';
      payload: { tableName: string; chartType: ChartType };
    };

type FieldEvent =
  | { type: 'fields/delete'; payload: { tableName: string; fieldName: string } }
  | {
      type: 'fields/add';
      payload: {
        tableName: string;
        fieldText: string;
        insertOptions?: {
          insertFromFieldName?: string;
          direction?: HorizontalDirection;
          withSelection?: boolean;
        };
      };
    }
  | {
      type: 'fields/swap';
      payload: {
        tableName: string;
        fieldName: string;
        direction: HorizontalDirection;
      };
    }
  | {
      type: 'fields/auto-fit';
      payload: { tableName: string };
    }
  | {
      type: 'fields/remove-sizes';
      payload: { tableName: string };
    }
  | {
      type: 'fields/increase-size';
      payload: { tableName: string; fieldName: string };
    }
  | {
      type: 'fields/decrease-size';
      payload: { tableName: string; fieldName: string };
    }
  | {
      type: 'fields/change-size';
      payload: { tableName: string; fieldName: string; valueAdd: number };
    }
  | {
      type: 'fields/change-dimension';
      payload: { tableName: string; fieldName: string; isRemove?: boolean };
    }
  | {
      type: 'fields/change-key';
      payload: { tableName: string; fieldName: string; isRemove?: boolean };
    }
  | {
      type: 'fields/create-control-from-field';
      payload: { tableName: string; fieldName: string; type: ControlType };
    }
  | {
      type: 'fields/change-index';
      payload: { tableName: string; fieldName: string; isRemove?: boolean };
    };

type TotalsEvent =
  | {
      type: 'totals/remove-by-index';
      payload: { tableName: string; fieldName: string; index: number };
    }
  | {
      type: 'totals/toggle-by-type';
      payload: { tableName: string; fieldName: string; type: TotalType };
    }
  | {
      type: 'totals/add-all-field-totals';
      payload: { tableName: string; fieldName: string };
    }
  | { type: 'totals/add-all-table-totals'; payload: { tableName: string } };

type FiltersEvent =
  | {
      type: 'filters/list-applied';
      payload: {
        tableName: string;
        fieldName: string;
        values: string[];
        isNumeric: boolean;
      };
    }
  | {
      type: 'filters/condition-applied';
      payload: {
        tableName: string;
        fieldName: string;
        operator: string;
        value: string | string[] | null;
        filterType: GridFilterType;
      };
    }
  | {
      type: 'filters/update-list';
      payload: {
        tableName: string;
        fieldName: string;
        getMoreValues?: boolean;
        searchValue: string;
        sort: 1 | -1;
      };
    };

type ControlEvent =
  | {
      type: 'control/apply';
      payload: {
        tableName: string;
        fieldName: string;
        values: string[];
      };
    }
  | {
      type: 'control/get-values';
      payload: {
        tableName: string;
        fieldName: string;
        getMoreValues?: boolean;
        searchValue: string;
      };
    }
  | {
      type: 'control/close';
      payload: {};
    };

type OverridesEvent =
  | {
      type: 'overrides/ai-regenerate';
      payload: {
        tableName: string;
        fieldName: string;
        overrideIndex: number;
      };
    }
  | {
      type: 'overrides/remove';
      payload: {
        tableName: string;
        fieldName: string;
        overrideIndex: number;
        value: OverrideValue;
      };
    }
  | {
      type: 'overrides/remove-row';
      payload: { tableName: string; overrideIndex: number };
    };

type NotesEvent =
  | {
      type: 'notes/update';
      payload: {
        tableName: string;
        fieldName?: string | undefined;
        note: string;
      };
    }
  | {
      type: 'notes/remove';
      payload: { tableName: string; fieldName?: string };
    };

type SortEvent = {
  type: 'sort/change';
  payload: { tableName: string; fieldName: string; order: FieldSortOrder };
};

type SystemEvent =
  | { type: 'system/message'; payload: string }
  | { type: 'system/undo' }
  | {
      type: 'system/open-details-panel';
      payload: {
        tableName: string;
      };
    }
  | { type: 'system/open-sheet'; payload: { args: { sheetName: string } } }
  | {
      type: 'system/open-in-editor';
      payload: {
        tableName: string;
        fieldName?: string;
        openOverride?: boolean;
      };
    }
  | {
      type: 'system/apply-suggestion';
      payload: {
        GPTSuggestions: GPTSuggestion[] | null;
        GPTFocusColumn: GPTFocusColumn[];
      };
    };

export type GridBusEvent =
  | SelectionEvent
  | ViewportEvent
  | EditorEvent
  | TablesEvent
  | FieldEvent
  | TotalsEvent
  | ChartsEvent
  | FiltersEvent
  | ControlEvent
  | NotesEvent
  | OverridesEvent
  | SortEvent
  | ClipboardEvent
  | SystemEvent;

export interface GridEventBus {
  events$: Observable<GridBusEvent>;
  emit: (ev: GridBusEvent) => void;
}

export function createGridEventBus(): GridEventBus {
  const subj = new Subject<GridBusEvent>();

  return {
    events$: subj.asObservable(),
    emit: (ev) => subj.next(ev),
  };
}
