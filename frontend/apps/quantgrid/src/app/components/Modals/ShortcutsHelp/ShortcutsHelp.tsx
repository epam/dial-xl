import { Button, Modal } from 'antd';
import cx from 'classnames';
import { useCallback, useEffect, useState } from 'react';

import {
  modalFooterButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';

import { ModalRefFunction } from '../../../common';
import { shortcuts } from './shortcuts';

type Props = {
  openShortcutHelpModal: { current: ModalRefFunction | null };
};

export function ShortcutsHelp({ openShortcutHelpModal }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    openShortcutHelpModal.current = showModal;
  }, [showModal, openShortcutHelpModal]);

  return (
    <Modal
      destroyOnHidden={true}
      footer={[
        <Button
          className={cx(modalFooterButtonClasses, secondaryButtonClasses)}
          key="back"
          onClick={handleCancel}
        >
          Close
        </Button>,
      ]}
      open={isModalOpen}
      title="Keyboard Shortcuts"
      onCancel={handleCancel}
    >
      <div className="max-h-[500px] overflow-y-auto thin-scrollbar my-5">
        <div className="flex flex-col bg-bg-layer-3">
          <div className="flex border border-stroke-tertiary">
            <div className="w-1/2 py-3 pl-5">
              <span className="text-text-secondary font-bold select-none">
                Shortcut
              </span>
            </div>
            <div className="w-1/2 py-3">
              <span className="text-text-secondary font-bold select-none">
                Description
              </span>
            </div>
          </div>
          {shortcuts.map((shortcut) => (
            <div
              className="flex flex-row justify-start items-center py-4 border-b border-x border-b-stroke-tertiary border-x-stroke-tertiary cursor-pointer hover:bg-bg-accent-primary-alpha"
              key={shortcut.key}
            >
              <div className="flex items-center w-1/2 pl-5 pr-2">
                <span className="text-text-primary select-none">
                  {shortcut.shortcut}
                </span>
              </div>
              <div className="w-1/2 pr-2">
                <span className="text-text-secondary select-none">
                  {shortcut.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
