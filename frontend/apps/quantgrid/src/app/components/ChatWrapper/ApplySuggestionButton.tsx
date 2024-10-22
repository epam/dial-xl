import { Button, Modal } from 'antd';
import cx from 'classnames';
import { useCallback, useState } from 'react';

import {
  GPTSuggestion,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
  secondaryDisabledButtonClasses,
} from '@frontend/common';

type Props = {
  GPTSuggestions: GPTSuggestion[] | null;

  applySuggestion: () => void;

  lastStageCompleted: boolean;
};

export function ApplySuggestionButton({
  GPTSuggestions,
  applySuggestion,
  lastStageCompleted,
}: Props) {
  const [sureModalOpen, setSureModalOpen] = useState(false);

  const onModifySheetsClick = useCallback(() => {
    if (!lastStageCompleted) {
      setSureModalOpen(true);

      return;
    }

    applySuggestion();
  }, [applySuggestion, lastStageCompleted]);

  const onOk = () => {
    applySuggestion();
    setSureModalOpen(false);
  };

  const onCancel = () => {
    setSureModalOpen(false);
  };

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
          secondaryButtonClasses,
          secondaryDisabledButtonClasses,
          'text-[13px] font-semibold h-8 w-full !rounded-none'
        )}
        disabled={!GPTSuggestions}
        onClick={onModifySheetsClick}
      >
        Apply suggestion
      </Button>
    </>
  );
}
