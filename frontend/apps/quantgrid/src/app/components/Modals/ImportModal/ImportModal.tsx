import { Modal } from 'antd';
import classNames from 'classnames';
import { useCallback, useContext, useEffect, useState } from 'react';

import {
  filesEndpointType,
  ImportSource,
  modalFooterButtonClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
} from '@quantgrid/common';

import { ProjectContext } from '../../../context';
import { useApiRequests } from '../../../hooks';
import { useAntdModalStore, useImportSourceModalStore } from '../../../store';
import { constructPath, encodeApiUrl } from '../../../utils';
import { ImportSteps } from './ImportSteps';

export function ImportModal() {
  const { projectBucket, projectName, projectPath } =
    useContext(ProjectContext);
  const { getImportSource } = useApiRequests();
  const isOpen = useImportSourceModalStore((s) => s.isOpen);
  const source = useImportSourceModalStore((s) => s.source);
  const submit = useImportSourceModalStore((s) => s.submit);
  const cancel = useImportSourceModalStore((s) => s.cancel);

  const [sourceData, setSourceData] = useState<ImportSource | null>(null);
  const [isDataChanged, setIsDataChanged] = useState(false);

  const confirmModal = useAntdModalStore((s) => s.confirm);

  const getSourceData = useCallback(async () => {
    if (!source) return;

    const sourceData = await getImportSource({
      project: encodeApiUrl(
        constructPath([
          filesEndpointType,
          projectBucket,
          projectPath,
          projectName,
        ]),
      ),
      source,
    });

    if (!sourceData.success) {
      cancel();

      return;
    }

    setSourceData(sourceData.data);
  }, [
    cancel,
    getImportSource,
    projectBucket,
    projectName,
    projectPath,
    source,
  ]);

  const handleCancel = useCallback(() => {
    if (!isDataChanged) {
      cancel();

      return;
    }

    confirmModal({
      icon: null,
      title: 'You have unsaved changes',
      content: `Are you sure you want to leave from creation of data source? You will lose all unsaved changes`,
      okButtonProps: {
        className: classNames(modalFooterButtonClasses, primaryButtonClasses),
      },
      cancelButtonProps: {
        className: classNames(modalFooterButtonClasses, secondaryButtonClasses),
      },
      onOk: () => cancel(),
    });
  }, [cancel, confirmModal, isDataChanged]);

  useEffect(() => {
    setSourceData(null);

    if (!source || !isOpen) return;

    getSourceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, isOpen]);

  if (source && !sourceData) return;

  return (
    <Modal
      destroyOnHidden={true}
      footer={null}
      open={isOpen}
      title={sourceData ? 'Update Source' : 'Create Source'}
      width={{
        xs: '90%',
        sm: '80%',
        md: '70%',
        lg: '800px',
      }}
      onCancel={handleCancel}
    >
      <ImportSteps
        sourceData={sourceData}
        onDataChanged={setIsDataChanged}
        onSuccess={submit}
      />
    </Modal>
  );
}
