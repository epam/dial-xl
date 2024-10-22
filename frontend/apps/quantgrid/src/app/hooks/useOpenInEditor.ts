import { useCallback, useContext } from 'react';

import { CodeEditorContext } from '@frontend/common';

import { PanelName } from '../common';
import { LayoutContext } from '../context';
import { useDSLUtils } from './ManualEditDSL';

export function useOpenInEditor() {
  const { openPanel } = useContext(LayoutContext);
  const { updateInitialOffset } = useContext(CodeEditorContext);
  const { findContext } = useDSLUtils();

  const goToEditor = useCallback(
    (startOffset: number) => {
      openPanel(PanelName.CodeEditor);
      updateInitialOffset(startOffset);
    },
    [openPanel, updateInitialOffset]
  );

  const openInEditor = useCallback(
    (tableName: string, fieldName?: string, openOverride = false) => {
      const isOpenTable = tableName && !fieldName;
      const isOpenField = tableName && fieldName && !openOverride;
      const context = findContext(tableName, fieldName);

      if (!context) return;

      const { table, field } = context;

      if (isOpenTable && table.dslTableNamePlacement?.start) {
        goToEditor(table.dslTableNamePlacement.start);

        return;
      }

      if (isOpenField && field?.dslFieldNamePlacement?.start) {
        goToEditor(field.dslFieldNamePlacement.start);

        return;
      }

      if (openOverride && table.dslOverridePlacement?.startOffset) {
        goToEditor(table.dslOverridePlacement.startOffset);

        return;
      }
    },
    [findContext, goToEditor]
  );

  return { openInEditor };
}
