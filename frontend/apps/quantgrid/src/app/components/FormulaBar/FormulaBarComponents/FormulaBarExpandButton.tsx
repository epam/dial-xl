import { Button } from 'antd';
import cx from 'classnames';
import { useShallow } from 'zustand/react/shallow';

import Icon from '@ant-design/icons';
import { ChevronDown } from '@frontend/common';

import { useFormulaBarStore } from '../../../store';

export function FormulaBarExpandButton() {
  const { formulaBarExpanded, setFormulaBarExpanded } = useFormulaBarStore(
    useShallow((s) => ({
      formulaBarExpanded: s.formulaBarExpanded,
      setFormulaBarExpanded: s.setFormulaBarExpanded,
    }))
  );

  return (
    <div>
      <Button
        className={cx(
          'h-full flex items-center justify-center bg-transparent hover:bg-transparent! border-none focus-visible:outline-hidden! w-auto!',
          formulaBarExpanded && 'transform rotate-180'
        )}
        icon={
          <Icon
            className="text-text-primary hover:text-text-accent-primary w-[18px]"
            component={() => <ChevronDown />}
          />
        }
        onClick={() => setFormulaBarExpanded(!formulaBarExpanded)}
      />
    </div>
  );
}
