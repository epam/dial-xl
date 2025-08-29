import { useContext, useMemo } from 'react';

import { AppContext } from '../../../context';

export function useFormulaInputStyles(
  fieldName: string | undefined,
  isEditingDimField: boolean
) {
  const { editMode } = useContext(AppContext);

  const borderColor = useMemo(() => {
    if (fieldName && editMode === 'edit_dim_expression' && !isEditingDimField)
      return '';

    if (!editMode || editMode === 'rename_field' || editMode === 'rename_table')
      return '';

    if (editMode === 'edit_override' || editMode === 'add_override') {
      return 'border-b border-b-strokeAccentSecondary';
    }

    return 'border-b border-b-strokeAccentPrimary';
  }, [editMode, fieldName, isEditingDimField]);

  return {
    borderColor,
  };
}
