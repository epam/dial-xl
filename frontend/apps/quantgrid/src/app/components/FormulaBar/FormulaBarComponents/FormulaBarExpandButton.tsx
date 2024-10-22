import { Button } from 'antd';
import cx from 'classnames';
import { useContext } from 'react';

import Icon from '@ant-design/icons';
import { ChevronDown } from '@frontend/common';

import { AppContext } from '../../../context';

export function FormulaBarExpandButton() {
  const { formulaBarExpanded, setFormulaBarExpanded } = useContext(AppContext);

  return (
    <div>
      <Button
        className={cx(
          'h-full flex items-center justify-center bg-transparent hover:!bg-transparent border-none focus-visible:!outline-none !w-auto',
          formulaBarExpanded && 'transform rotate-180'
        )}
        icon={
          <Icon
            className="text-textPrimary"
            component={() => <ChevronDown />}
          />
        }
        onClick={() => setFormulaBarExpanded(!formulaBarExpanded)}
      />
    </div>
  );
}
