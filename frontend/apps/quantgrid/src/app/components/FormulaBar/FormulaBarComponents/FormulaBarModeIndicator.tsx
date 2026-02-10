import { Tooltip } from 'antd';
import cx from 'classnames';
import { useShallow } from 'zustand/react/shallow';

import Icon from '@ant-design/icons';
import { formulaBarMenuClass, FormulaIcon, ValueIcon } from '@frontend/common';

import {
  useEditorStore,
  useFormulaBarStore,
  useFormulaMenuStore,
} from '../../../store';

export function FormulaBarModeIndicator() {
  const { formulaBarMode, formulaBarExpanded } = useFormulaBarStore(
    useShallow((s) => ({
      formulaBarMode: s.formulaBarMode,
      formulaBarExpanded: s.formulaBarExpanded,
    }))
  );
  const pointClickModeSource = useEditorStore((s) => s.pointClickModeSource);
  const setFormulasMenu = useFormulaMenuStore((s) => s.setFormulasMenu);

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
