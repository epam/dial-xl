import { ReactNode, useCallback, useEffect, useState } from 'react';

import { GridCellEditorMode } from '@frontend/canvas-spreadsheet';
import {
  AppTheme,
  defaultTheme,
  FormulaBarMode,
  injectThemeStyles,
  PointClickModeSource,
  ViewportInteractionMode,
  zoomValues,
} from '@frontend/common';

import { AppContext, ChatPlacement, PivotTableWizardMode } from './AppContext';

type Props = {
  children: ReactNode;
};

const defaultChatPlacement: ChatPlacement = 'panel';

function getInitialZoom() {
  const zoom = localStorage.getItem('zoom');

  if (!zoom || !zoomValues.includes(Number(zoom))) return 1;

  return Number(zoom);
}

function saveZoom(zoom: number) {
  localStorage.setItem('zoom', String(zoom));
}

export function AppContextProvider({ children }: Props) {
  const [zoom, setZoom] = useState(getInitialZoom());
  const [formulaBarMode, setFormulaBarMode] =
    useState<FormulaBarMode>('formula');
  const [formulaBarExpanded, setFormulaBarExpanded] = useState(false);
  const [editMode, setEditMode] = useState<GridCellEditorMode>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(defaultTheme);
  const [showHiddenFiles, setShowHiddenFiles] = useState(false);
  const [isChatOpen, setChatOpen] = useState(false);
  const [isPointClickMode, setIsPointClickMode] = useState(false);
  const [pointClickModeSource, setPointClickModeSource] =
    useState<PointClickModeSource>(null);
  const [chatWindowPlacement, setChatWindowPlacement] =
    useState<ChatPlacement>(defaultChatPlacement);
  const [formulasMenuPlacement, setFormulasMenuPlacement] = useState<
    { x: number; y: number } | undefined
  >();
  const [formulasMenuTriggerContext, setFormulasMenuTriggerContext] = useState<
    'CodeEditor' | 'FormulaBar' | 'CellEditor' | undefined
  >();
  const [viewportInteractionMode, setViewportInteractionMode] =
    useState<ViewportInteractionMode>('select');
  const [pivotTableWizardMode, setCreatePivotTableActive] =
    useState<PivotTableWizardMode>(null);
  const [pivotTableName, setPivotTableName] = useState<string | null>(null);

  const setFormulasMenu = useCallback(
    (
      value: { x: number; y: number } | undefined,
      triggerContext: 'CodeEditor' | 'FormulaBar' | 'CellEditor'
    ) => {
      setFormulasMenuPlacement(value);
      setFormulasMenuTriggerContext(triggerContext);
    },
    []
  );

  const updateZoom = useCallback((newZoom: number) => {
    if (!zoomValues.some((z) => z === newZoom))
      throw new Error('[AppContext] Invalid zoom value');
    setZoom(newZoom);
    saveZoom(newZoom);
  }, []);

  const updateZoomWithWheel = useCallback(
    (direction: number) => {
      const currentZoomIndex = zoomValues.findIndex((z) => z === zoom);
      const nextZoomIndex = currentZoomIndex + direction;

      if (nextZoomIndex < 0 || nextZoomIndex >= zoomValues.length) return;

      updateZoom(zoomValues[nextZoomIndex]);
    },
    [updateZoom, zoom]
  );

  const hideLoading = (timeout = 300) => {
    setTimeout(() => {
      setLoading(false);
    }, timeout);
  };

  const updateTheme = useCallback((theme: string) => {
    const isValidTheme =
      theme && Object.values(AppTheme).includes(theme as AppTheme);
    const updateTheme = isValidTheme ? (theme as AppTheme) : defaultTheme;
    setTheme(updateTheme);
    localStorage.setItem('app-theme', updateTheme);
    document.documentElement.className = updateTheme;
  }, []);

  const toggleChat = useCallback(() => {
    setChatOpen((isOpen) => !isOpen);
  }, []);

  const toggleChatWindowPlacement = useCallback(() => {
    const updatedChatPlacement =
      chatWindowPlacement === 'panel' ? 'floating' : 'panel';

    localStorage.setItem('chat-window-placement', updatedChatPlacement);

    setChatOpen(updatedChatPlacement === 'floating');
    setChatWindowPlacement(updatedChatPlacement);
  }, [chatWindowPlacement]);

  const switchPointClickMode = useCallback(
    (isPointClickMode: boolean, source: PointClickModeSource = null) => {
      setIsPointClickMode(isPointClickMode);
      setPointClickModeSource(isPointClickMode ? source : null);
    },
    []
  );

  const switchShowHiddenFiles = useCallback((showHiddenFiles: boolean) => {
    setShowHiddenFiles(showHiddenFiles);
    localStorage.setItem('show-hidden-files', String(showHiddenFiles));
  }, []);

  const changePivotTableWizardMode = useCallback(
    (enable: PivotTableWizardMode, tableName?: string) => {
      setCreatePivotTableActive(enable);
      setPivotTableName(tableName || null);
    },
    []
  );

  useEffect(() => {
    if (isPointClickMode && editMode) {
      const eligibleEditModes: GridCellEditorMode[] = [
        'empty_cell',
        'edit_dim_expression',
        'edit_field_expression',
        'edit_cell_expression',
        'add_total',
        'edit_total',
        'edit_override',
        'add_override',
      ];

      if (!eligibleEditModes.includes(editMode)) {
        switchPointClickMode(false);
      }
    }
  }, [editMode, isPointClickMode, switchPointClickMode]);

  useEffect(() => {
    const theme = localStorage.getItem('app-theme');
    const isValidTheme =
      theme && Object.values(AppTheme).includes(theme as AppTheme);

    updateTheme(isValidTheme ? (theme as AppTheme) : defaultTheme);
  }, [updateTheme]);

  useEffect(() => {
    const chatPlacement = localStorage.getItem('chat-window-placement');
    const isValidPlacement =
      chatPlacement &&
      ['panel', 'floating'].includes(chatPlacement as ChatPlacement);

    setChatWindowPlacement(
      isValidPlacement ? (chatPlacement as ChatPlacement) : defaultChatPlacement
    );
  }, []);

  useEffect(() => {
    const showHiddenFiles = localStorage.getItem('show-hidden-files');
    setShowHiddenFiles(showHiddenFiles === 'true');
  }, []);

  useEffect(() => {
    injectThemeStyles(theme);
  }, [theme]);

  return (
    <AppContext.Provider
      value={{
        zoom,
        updateZoom,
        updateZoomWithWheel,
        theme,
        updateTheme,
        loading,
        setLoading,
        hideLoading,
        toggleChat,
        isChatOpen,
        chatWindowPlacement,
        toggleChatWindowPlacement,

        formulaBarMode,
        setFormulaBarMode,
        formulaBarExpanded,
        setFormulaBarExpanded,
        editMode,
        setEditMode,

        isPointClickMode,
        switchPointClickMode,
        pointClickModeSource,

        formulasMenuPlacement,
        formulasMenuTriggerContext,
        setFormulasMenu,

        showHiddenFiles,
        switchShowHiddenFiles,

        viewportInteractionMode,
        setViewportInteractionMode,

        changePivotTableWizardMode,
        pivotTableWizardMode,
        pivotTableName,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
