import { useMemo } from 'react';

import { useEditorStore } from '../../../store';

export function useFormulaInputStyles(
  fieldName: string | undefined,
  isEditingDimField: boolean,
) {
  const editMode = useEditorStore((s) => s.editMode);

  const borderColor = useMemo(() => {
    if (fieldName && editMode === 'edit_dim_expression' && !isEditingDimField)
      return '';

    if (!editMode || editMode === 'rename_field' || editMode === 'rename_table')
      return '';

    if (editMode === 'edit_override' || editMode === 'add_override') {
      return 'border-b border-b-stroke-accent-secondary';
    }

    return 'border-b border-b-stroke-accent-primary';
  }, [editMode, fieldName, isEditingDimField]);

  return {
    borderColor,
  };
}
