import { createContext } from 'react';

import { GridCellEditorMode } from '@frontend/canvas-spreadsheet';
import {
  AppTheme,
  FormulaBarMode,
  PointClickModeSource,
  ViewportInteractionMode,
} from '@frontend/common';

type AppContextActions = {
  updateZoom: (newZoom: number) => void;
  updateZoomWithWheel: (direction: number) => void;

  setLoading: (loading: boolean) => void;
  hideLoading: (timeout?: number) => void;

  updateTheme: (theme: string) => void;

  toggleChat: () => void;
  toggleChatWindowPlacement: () => void;

  setFormulaBarMode: (mode: FormulaBarMode) => void;
  setFormulaBarExpanded: (expanded: boolean) => void;
  setEditMode: (mode: GridCellEditorMode) => void;
  switchPointClickMode: (
    isPointClickMode: boolean,
    source?: PointClickModeSource
  ) => void;
  setFormulasMenu: (
    value: { x: number; y: number } | undefined,
    triggerContext: 'CodeEditor' | 'FormulaBar' | 'CellEditor'
  ) => void;
  switchShowHiddenFiles: (showHiddenFiles: boolean) => void;

  viewportInteractionMode: ViewportInteractionMode;
  setViewportInteractionMode: (mode: ViewportInteractionMode) => void;

  changePivotTableWizardMode: (
    mode: PivotTableWizardMode,
    tableName?: string
  ) => void;
};

export type PivotTableWizardMode = 'create' | 'edit' | null;
export type ChatPlacement = 'panel' | 'floating';
type AppContextValues = {
  isChatOpen: boolean;
  chatWindowPlacement: ChatPlacement;
  loading: boolean;
  theme: AppTheme;
  zoom: number;

  formulaBarMode: FormulaBarMode;
  formulaBarExpanded: boolean;
  editMode: GridCellEditorMode;
  isPointClickMode: boolean;
  pointClickModeSource: PointClickModeSource;

  formulasMenuPlacement: { x: number; y: number } | undefined;
  formulasMenuTriggerContext:
    | 'CodeEditor'
    | 'FormulaBar'
    | 'CellEditor'
    | undefined;
  showHiddenFiles: boolean;

  pivotTableWizardMode: PivotTableWizardMode;
  pivotTableName: string | null;
};

export const AppContext = createContext<AppContextActions & AppContextValues>(
  {} as AppContextActions & AppContextValues
);
