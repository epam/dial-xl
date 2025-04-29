import { Checkbox, Spin, Tooltip } from 'antd';
import classNames from 'classnames';
import { useContext } from 'react';

import Icon from '@ant-design/icons';
import {
  EyeIcon,
  EyeOffIcon,
  HintStarIcon,
  PlusIcon,
  TrashIcon,
} from '@frontend/common';

import { AIHintsContext, ProjectContext } from '../../../context';
import { PanelEmptyMessage } from '../PanelEmptyMessage';

export const AIHints = () => {
  const {
    hints,
    hintsValidationResult,
    isHintsLoading,
    newHintsModal,
    editHintModal,
    deleteHintModal,
    selectedHintsIndexes,
    toggleSelectionHint,
    toggleHintVisibility,
  } = useContext(AIHintsContext);
  const { isProjectEditable } = useContext(ProjectContext);

  return (
    <div className="flex flex-col w-full h-full bg-bgLayer3 text-textPrimary overflow-hidden">
      <div className="w-full p-1 border-b border-b-strokeTertiary flex flex-col">
        <button
          className="group flex items-center rounded-[3px] text-textPrimary py-1 px-2 hover:bg-bgAccentPrimaryAlpha disabled:hover:bg-inherit disabled:text-controlsTextDisable disabled:cursor-not-allowed"
          disabled={!isProjectEditable}
          onClick={() => newHintsModal()}
        >
          <Icon
            className="w-[12px] text-textSecondary mr-2 group-disabled:stroke-controlsTextDisable"
            component={() => <PlusIcon />}
          />
          <span className="text-[13px] leading-[14px]">Add new hint</span>
        </button>
      </div>

      <div className="flex flex-col grow overflow-auto thin-scrollbar">
        {isHintsLoading ? (
          <div className="flex grow items-center justify-center">
            <Spin className="z-50" size="large"></Spin>
          </div>
        ) : hints.length === 0 ? (
          <PanelEmptyMessage message="No AI hints" />
        ) : (
          <div className="p-1">
            {hints.map((hint, index) => (
              <div
                className="flex gap-1 overflow-hidden justify-between rounded-[3px] max-w-full truncate group items-center py-1 px-2 hover:bg-bgAccentPrimaryAlpha hover:cursor-pointer"
                key={hint.name || index}
                onClick={() => editHintModal(index)}
              >
                <div className="flex gap-1 items-center max-w-full overflow-hidden">
                  <span className="w-4 h-6 shrink-0 flex items-center">
                    <span className={classNames('flex items-center h-full')}>
                      <Icon
                        className={classNames(
                          'group-hover:hidden w-[18px] text-textSecondary',
                          selectedHintsIndexes.includes(index) && 'hidden'
                        )}
                        component={() => <HintStarIcon />}
                      />
                      <Checkbox
                        checked={selectedHintsIndexes.includes(index)}
                        rootClassName={classNames(
                          'group-hover:flex',
                          !selectedHintsIndexes.includes(index) && 'hidden'
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSelectionHint(index);
                        }}
                      />
                    </span>
                  </span>
                  <span
                    className={classNames(
                      'truncate text-[13px] leading-none shrink select-none',
                      hint.isDisabled
                        ? 'text-textSecondary'
                        : !hintsValidationResult[index]
                        ? 'text-textError'
                        : ''
                    )}
                  >
                    {hint.name}
                  </span>
                </div>
                {isProjectEditable && (
                  <div className="shrink-0 hidden group-hover:flex gap-1 items-center h-[18px]">
                    <Tooltip
                      title={hint.isDisabled ? 'Enable hint' : 'Disable hint'}
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          toggleHintVisibility(index);
                        }}
                      >
                        <Icon
                          className="w-[18px] text-textSecondary hover:text-textAccentPrimary"
                          component={() =>
                            hint.isDisabled ? <EyeOffIcon /> : <EyeIcon />
                          }
                        />
                      </button>
                    </Tooltip>
                    <Tooltip title="Remove hint">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          deleteHintModal(index);
                        }}
                      >
                        <Icon
                          className="w-[18px] text-textSecondary hover:text-textAccentPrimary"
                          component={() => <TrashIcon />}
                        />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
