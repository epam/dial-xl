import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { GridCellEditorMode } from '@frontend/canvas-spreadsheet';
import { PointClickModeSource } from '@frontend/common';

type Nullable<T> = T | null;

const eligiblePointClickEditModes: GridCellEditorMode[] = [
  'empty_cell',
  'edit_dim_expression',
  'edit_field_expression',
  'edit_cell_expression',
  'add_total',
  'edit_total',
  'edit_override',
  'add_override',
];

export type EditorState = {
  editMode: Nullable<GridCellEditorMode>;
  isPointClickMode: boolean;
  pointClickModeSource: Nullable<PointClickModeSource>;
};

export type EditorActions = {
  setEditMode: (m: Nullable<GridCellEditorMode>) => void;
  switchPointClickMode: (
    enabled: boolean,
    source?: Nullable<PointClickModeSource>
  ) => void;
};

export type EditorStore = EditorState & EditorActions;

export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector((set, get) => ({
    editMode: null,
    isPointClickMode: false,
    pointClickModeSource: null,

    setEditMode: (m) => {
      const { isPointClickMode } = get();
      if (isPointClickMode && m && !eligiblePointClickEditModes.includes(m)) {
        set({
          isPointClickMode: false,
          pointClickModeSource: null,
        });
      }
      set({ editMode: m });
    },

    switchPointClickMode: (enabled, source = null) => {
      const { editMode } = get();
      const canEnable =
        !!editMode && eligiblePointClickEditModes.includes(editMode);
      if (enabled && !canEnable) {
        set({ isPointClickMode: false, pointClickModeSource: null });

        return;
      }
      set({
        isPointClickMode: enabled,
        pointClickModeSource: enabled ? source : null,
      });
    },
  }))
);
