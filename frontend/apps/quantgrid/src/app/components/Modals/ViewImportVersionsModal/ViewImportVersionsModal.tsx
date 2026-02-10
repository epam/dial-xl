import { Modal, Spin, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import cx from 'classnames';
import { format } from 'date-fns';
import { useContext, useEffect, useMemo, useState } from 'react';

import {
  filesEndpointType,
  ImportSync,
  ImportSyncStatus,
  modalFooterButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';

import { ProjectContext } from '../../../context';
import { useApiRequests } from '../../../hooks';
import { useViewImportVersionsModalStore } from '../../../store';
import { constructPath, encodeApiUrl } from '../../../utils';

type SyncTableData = {
  key: string;
  status: ImportSyncStatus;
  version: string;
  startedAt: string;
  stoppedAt: string;
  schema: string;
  sync: ImportSync;
};

export function ViewImportVersionsModal() {
  const isOpen = useViewImportVersionsModalStore((s) => s.isOpen);
  const sourceKey = useViewImportVersionsModalStore((s) => s.sourceKey);
  const datasetKey = useViewImportVersionsModalStore((s) => s.datasetKey);
  const close = useViewImportVersionsModalStore((s) => s.close);

  const { projectName, projectBucket, projectPath } =
    useContext(ProjectContext);
  const { listImportSyncs } = useApiRequests();

  const [syncs, setSyncs] = useState<ImportSync[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !sourceKey || !datasetKey) return;

    const fetchSyncs = async () => {
      if (!projectName || !projectBucket) return;

      setIsLoading(true);

      const project = encodeApiUrl(
        constructPath([
          filesEndpointType,
          projectBucket,
          projectPath,
          projectName,
        ])
      );

      const response = await listImportSyncs({
        project,
        source: sourceKey,
        dataset: datasetKey,
      });

      setIsLoading(false);

      if (response?.syncs) {
        const syncList = Object.values(response.syncs);
        setSyncs(syncList);
      } else {
        setSyncs([]);
      }
    };

    fetchSyncs();
  }, [
    isOpen,
    sourceKey,
    datasetKey,
    projectName,
    projectBucket,
    projectPath,
    listImportSyncs,
  ]);

  const columns: ColumnsType<SyncTableData> = [
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ImportSyncStatus) => (
        <span
          className="px-2 py-1 rounded-4xl border leading-none font-bold text-[10px]"
          style={{
            borderColor: getStatusColor(status),
            color: getStatusColor(status),
          }}
        >
          {status}
        </span>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 120,
    },
    {
      title: 'Started At',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 200,
      render: formatDate,
    },
    {
      title: 'Stopped At',
      dataIndex: 'stoppedAt',
      key: 'stoppedAt',
      width: 200,
      render: formatDate,
    },
  ];

  const tableData: SyncTableData[] = useMemo(() => {
    return syncs.map((sync, index) => ({
      key: sync.sync || `sync-${index}`,
      status: sync.status,
      version: sync.version || '-',
      startedAt: sync.startedAt,
      stoppedAt: sync.stoppedAt,
      schema: sync.schema
        ? JSON.stringify(sync.schema, null, 2)
        : 'No schema available',
      sync,
    }));
  }, [syncs]);

  return (
    <Modal
      cancelButtonProps={{
        className: cx(modalFooterButtonClasses, secondaryButtonClasses),
      }}
      className="min-w-[min(70dvw,1000px)] px-0!"
      destroyOnHidden={true}
      footer={null}
      open={isOpen}
      title="Versions"
      onCancel={close}
    >
      <div className="mt-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Spin size="large" />
          </div>
        ) : syncs.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            No versions found for this dataset
          </div>
        ) : (
          <>
            <div>
              <span>Dataset: {datasetKey}</span>
            </div>
            <hr className="border-stroke-primary" />
            <Table
              className="border border-stroke-primary"
              columns={columns}
              dataSource={tableData}
              expandable={{
                expandedRowKeys,
                expandedRowRender: (record) => (
                  <div className="p-4 bg-bg-layer-4 text-text-primary">
                    <div className="text-sm font-semibold mb-2">Schema:</div>
                    <pre className="bg-bg-layer-2 p-3 rounded overflow-auto max-h-96 text-xs">
                      {record.schema}
                    </pre>
                  </div>
                ),
                rowExpandable: (record) => !!record.sync.schema,
                onExpandedRowsChange: (keys) =>
                  setExpandedRowKeys(keys as string[]),
              }}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                showTotal: (total) =>
                  `Total ${total} version${total > 1 ? 's' : ''}`,
              }}
              scroll={{ x: 'max-content' }}
              size="small"
            />
          </>
        )}
      </div>
    </Modal>
  );
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-';

  return format(new Date(parseInt(dateString, 10)), 'PPpp');
};

const getStatusColor = (status: ImportSyncStatus) => {
  switch (status) {
    case 'SUCCEEDED':
      return 'var(--color-stroke-accent-secondary)';
    case 'RUNNING':
      return 'var(--color-stroke-accent-tertiary)';
    case 'FAILED':
      return 'var(--color-stroke-error)';
    default:
      return 'default';
  }
};
