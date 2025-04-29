import { Button, Modal } from 'antd';
import cx from 'classnames';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  CheckIcon,
  GPTSuggestion,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
  SparklesIcon,
  WorksheetState,
} from '@frontend/common';

type Props = {
  GPTSuggestions: GPTSuggestion[] | null;

  applySuggestion: () => void;

  lastStageCompleted: boolean;
  projectSheets: WorksheetState[] | null;
  currentSheetName: string | null;
};

export function ApplySuggestionButton({
  GPTSuggestions,
  applySuggestion,
  lastStageCompleted,
  projectSheets,
  currentSheetName,
}: Props) {
  const [sureModalOpen, setSureModalOpen] = useState(false);
  const [applySuggestionApplied, setApplySuggestionApplied] = useState(false);
  const [suggestionAppliedSheetName, setSuggestionApplySheetName] = useState<
    string | null
  >(null);
  const [isSuggestionsAlreadyChanged, setIsSuggestionsAlreadyChanged] =
    useState(false);
  const [isSheetsAlreadyChanged, setIsSheetsAlreadyChanged] = useState(false);

  const appliedSuggestionSheet = useMemo(
    () =>
      projectSheets?.find(
        (sheet) => sheet.sheetName === suggestionAppliedSheetName
      ),
    [projectSheets, suggestionAppliedSheetName]
  );

  const onModifySheetsClick = useCallback(() => {
    if (!lastStageCompleted) {
      setSureModalOpen(true);

      return;
    }

    setSuggestionApplySheetName(currentSheetName);
    setIsSuggestionsAlreadyChanged(true);
    setIsSheetsAlreadyChanged(true);
    setApplySuggestionApplied(true);
    applySuggestion();
  }, [applySuggestion, currentSheetName, lastStageCompleted]);

  const onOk = () => {
    setSuggestionApplySheetName(currentSheetName);
    setIsSuggestionsAlreadyChanged(true);
    setIsSheetsAlreadyChanged(true);
    setApplySuggestionApplied(true);

    applySuggestion();
    setSureModalOpen(false);
  };

  const onCancel = () => {
    setSureModalOpen(false);
  };

  useEffect(() => {
    if (isSheetsAlreadyChanged) {
      setIsSheetsAlreadyChanged(false);
    } else {
      setApplySuggestionApplied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSuggestionSheet]);

  useEffect(() => {
    if (isSuggestionsAlreadyChanged) {
      setIsSuggestionsAlreadyChanged(false);
    } else {
      setApplySuggestionApplied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [GPTSuggestions]);

  return (
    <>
      <Modal
        cancelButtonProps={{
          className: cx(modalFooterButtonClasses, secondaryButtonClasses),
        }}
        destroyOnClose={true}
        okButtonProps={{
          className: cx(
            modalFooterButtonClasses,
            primaryButtonClasses,
            primaryDisabledButtonClasses
          ),
        }}
        open={sureModalOpen}
        onCancel={onCancel}
        onOk={onOk}
      >
        <div>
          Suggested changes contain errors.
          <b> Are you sure you want to apply?</b>
        </div>
      </Modal>
      <Button
        className={cx(
          '!border-x-0 !border-b-0 border-t !border-strokePrimary rounded-[3px] !text-textPrimary !bg-bgLayer3 !shadow-none hover:!border-bgLayer4 hover:!bg-bgLayer4 hover:disabled:!bg-bgLayer3 disabled:!text-controlsTextDisable hover:!text-textAccentPrimary focus:!outline-0 focus-visible:!outline-0 focus:!border focus:!border-strokeHoverFocus focus:!bg-bgLayer4',
          'flex !gap-3 items-center text-[13px] font-semibold h-8 w-full !rounded-none shrink-0'
        )}
        disabled={!GPTSuggestions?.length || applySuggestionApplied}
        onClick={onModifySheetsClick}
      >
        {applySuggestionApplied ? (
          <div className="flex gap-2 items-center">
            <Icon
              className="size-[18px] text-textAccentSecondary"
              component={() => <CheckIcon />}
            />
            <span className="text-textPrimary">Suggestion applied</span>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <Icon className="size-[18px]" component={() => <SparklesIcon />} />
            <span>Apply suggestion</span>
          </div>
        )}
      </Button>
    </>
  );
}
