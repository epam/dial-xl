import { Input, Modal, Table } from 'antd';
import { ColumnType } from 'antd/es/table';
import cx from 'classnames';
import Fuse, { IFuseOptions } from 'fuse.js';
import { useEffect, useMemo, useState } from 'react';

import {
  modalFooterButtonClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';
import { inputClasses, SearchIcon } from '@frontend/common/lib';

import { ImportArgs } from '../../../hooks';
import { useSyncImportsConfirmModalStore } from '../../../store';

const fuseOptions: IFuseOptions<ImportArgs> = {
  includeScore: true,
  shouldSort: true,
  includeMatches: true,
  threshold: 0.2,
  keys: [
    { name: 'source', getFn: (obj) => obj.source },
    { name: 'dataset', getFn: (obj) => obj.dataset },
  ],
};

export function SyncImportsConfirmModal() {
  const isOpen = useSyncImportsConfirmModalStore((s) => s.isOpen);
  const title = useSyncImportsConfirmModalStore((s) => s.title);
  const okText = useSyncImportsConfirmModalStore((s) => s.okText);
  const primaryMessage = useSyncImportsConfirmModalStore(
    (s) => s.primaryMessage,
  );
  const listItems = useSyncImportsConfirmModalStore((s) => s.listItems);
  const submit = useSyncImportsConfirmModalStore((s) => s.submit);
  const close = useSyncImportsConfirmModalStore((s) => s.close);

  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearchValue('');
    }
  }, [isOpen]);

  const fuse = useMemo(() => new Fuse(listItems, fuseOptions), [listItems]);

  const filteredItems = useMemo(() => {
    if (!searchValue.trim()) {
      return listItems;
    }

    return fuse.search(searchValue).map((result) => result.item);
  }, [searchValue, fuse, listItems]);

  const tableData = useMemo(
    () =>
      filteredItems.map((value, index) => ({
        key: `${value.source}/${value.dataset}-${index}`,
        resultedInput: `${value.source}/${value.dataset}`,
        version: value.version,
      })),
    [filteredItems],
  );

  const columns: ColumnType[] = useMemo(
    () => [
      {
        title: 'Input name',
        dataIndex: 'resultedInput',
        key: 'resultedInput',
        minWidth: 300,
        ellipsis: true,
      },
      {
        title: 'Current version',
        dataIndex: 'version',
        key: 'version',
        ellipsis: true,
      },
      {
        title: 'New version',
        dataIndex: 'version',
        key: 'newVersion',
        render: (version) => version + 1,
        ellipsis: true,
      },
    ],
    [],
  );

  if (!listItems.length) return null;

  return (
    <Modal
      cancelButtonProps={{
        className: cx(modalFooterButtonClasses, secondaryButtonClasses),
      }}
      destroyOnHidden={true}
      okButtonProps={{
        className: cx(modalFooterButtonClasses, primaryButtonClasses),
      }}
      okText={okText}
      open={isOpen}
      title={title}
      width={{ sm: 600 }}
      onCancel={close}
      onOk={submit}
    >
      <div className="space-y-4">
        <p className="text-text-secondary text-sm">{primaryMessage}</p>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">External inputs to sync</span>
            <span>{filteredItems.length} found</span>
          </div>

          <div className="w-full">
            <Input
              className={inputClasses}
              placeholder="Search columns..."
              prefix={
                <div className="size-[18px] text-text-secondary shrink-0">
                  <SearchIcon />
                </div>
              }
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          <div className="border border-stroke-primary rounded-md overflow-hidden">
            <Table
              columns={columns}
              dataSource={tableData}
              pagination={false}
              scroll={{ y: tableData.length > 5 ? 440 : undefined }}
              size="small"
              tableLayout="auto"
            />
          </div>
        </div>

        <p className="text-text-secondary text-sm">
          This operation may take some time. Please, do not close the page or
          else your progress will be lost.
        </p>
      </div>
      <hr className="border-stroke-primary w-[calc(100%+48px)] -ml-6 my-4" />
    </Modal>
  );
}
