import { Button, Modal, Table } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { ModalRefFunction } from '../../common';
import { columns, shortcuts } from './shortcuts';

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
      footer={[
        <Button key="back" onClick={handleCancel}>
          Close
        </Button>,
      ]}
      open={isModalOpen}
      title="Keyboard Shortcuts"
      onCancel={handleCancel}
    >
      <div className="max-h-[500px] overflow-y-auto">
        <Table
          columns={columns}
          dataSource={shortcuts}
          pagination={false}
          scroll={{ y: 400 }}
        />
      </div>
    </Modal>
  );
}
