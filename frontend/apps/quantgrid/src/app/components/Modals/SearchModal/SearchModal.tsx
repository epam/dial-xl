import { Modal } from 'antd';

import { useSearchModalStore } from '../../../store';
import { SearchWindow } from './SearchWindow';

export function SearchModal() {
  const isOpen = useSearchModalStore((s) => s.isOpen);
  const close = useSearchModalStore((s) => s.close);

  return (
    <Modal
      closeIcon={null}
      destroyOnHidden={true}
      footer={null}
      open={isOpen}
      style={{ top: 12 }}
      title={null}
      onCancel={close}
    >
      <SearchWindow />
    </Modal>
  );
}
