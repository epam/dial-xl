import { Tooltip } from 'antd';
import cx from 'classnames';
import { useContext } from 'react';

import Icon from '@ant-design/icons';
import { formulaBarMenuClass, FormulaIcon, ValueIcon } from '@frontend/common';

import { AppContext } from '../../../context';

export function FormulaBarModeIndicator() {
  const {
    formulaBarExpanded,
    formulaBarMode,
    setFormulasMenu,
    pointClickModeSource,
  } = useContext(AppContext);
  const formulasMenuAvailable = formulaBarMode === 'formula';

  const Tag = formulasMenuAvailable ? 'button' : 'div';

  return (
    <div
      className={cx(
        'h-full flex border-r border-r-stroke-tertiary',
        {
          'items-center': !formulaBarExpanded,
          'items-start': formulaBarExpanded,
        },
        formulaBarMenuClass
      )}
    >
      <span
        className={cx(
          'text-[13px] px-2 leading-none select-none text-text-secondary text-ellipsis inline-block overflow-hidden whitespace-nowrap',
          {
            'pt-2': formulaBarExpanded,
          }
        )}
      >
        <Tooltip
          title={formulaBarMode === 'value' ? 'Value mode' : 'Formula mode'}
          destroyOnHidden
        >
          <Tag
            className={cx(
              'w-[28px] h-5 p-0 text-text-secondary flex items-center justify-center',
              formulasMenuAvailable && 'hover:text-text-accent-primary'
            )}
            onClick={(e) => {
              if (!formulasMenuAvailable) return;

              setFormulasMenu(
                { x: e.clientX, y: e.clientY },
                pointClickModeSource === 'cell-editor'
                  ? 'CellEditor'
                  : 'FormulaBar'
              );
            }}
          >
            <Icon
              className="w-4"
              component={() =>
                formulaBarMode === 'value' ? (
                  <ValueIcon className={formulaBarMenuClass} />
                ) : (
                  <FormulaIcon className={formulaBarMenuClass} />
                )
              }
            />
          </Tag>
        </Tooltip>
      </span>
    </div>
  );
}
