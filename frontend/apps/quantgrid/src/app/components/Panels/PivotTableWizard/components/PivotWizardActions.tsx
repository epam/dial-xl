import { Button } from 'antd';
import cx from 'classnames';
import { useContext } from 'react';

import {
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';

import { AppContext } from '../../../../context';
import { PivotWizardContext } from '../PivotWizardContext';

export function PivotWizardActions() {
  const { changePivotTableWizardMode, pivotTableWizardMode } =
    useContext(AppContext);
  const { applyChanges, shouldDisableApplyButton } =
    useContext(PivotWizardContext);

  return (
    <div className="py-2 px-4 border-t border-strokeTertiary flex justify-end bg-bgLayer3 flex-shrink-0">
      <Button
        className={cx(secondaryButtonClasses)}
        onClick={() => changePivotTableWizardMode(null)}
      >
        Cancel
      </Button>
      <Button
        className={cx(
          primaryButtonClasses,
          primaryDisabledButtonClasses,
          'ml-2'
        )}
        disabled={shouldDisableApplyButton}
        onClick={applyChanges}
      >
        {pivotTableWizardMode === 'create' ? 'Create' : 'Update'}
      </Button>
    </div>
  );
}
