import { useCallback, useContext } from 'react';

import { CodeEditorContext } from '@frontend/common';

import { PanelName } from '../common';
import { LayoutContext } from '../context';
import { useDSLUtils } from './EditDsl';

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

      if (isOpenTable && table.span) {
        goToEditor(table.span.from);

        return;
      }

      if (isOpenField && field?.span) {
        goToEditor(field.span.from);

        return;
      }

      if (openOverride && table.overrides?.span) {
        goToEditor(table.overrides.span.from);

        return;
      }
    },
    [findContext, goToEditor]
  );

  return { openInEditor };
}
