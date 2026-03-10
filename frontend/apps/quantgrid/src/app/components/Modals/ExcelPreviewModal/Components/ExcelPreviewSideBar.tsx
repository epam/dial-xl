import { Tree } from 'antd';
import cx from 'classnames';
import { useMemo } from 'react';

import Icon from '@ant-design/icons';
import {
  CloseIcon,
  DownOutlinedIcon,
  ExclamationCircleIcon,
  FileIcon,
  TableIcon,
  XLSFileIcon,
} from '@frontend/common';

import { ExcelEntities, ExcelTarget } from '../utils';

type Props = {
  loading: boolean;
  excelEntities: ExcelEntities;
  hasAnyNodes: boolean;
  fileName: string;
  target: ExcelTarget;
  isOverlay?: boolean;
  onClose?: () => void;
  onTargetChange: (t: ExcelTarget) => void;
};

export function ExcelPreviewSideBar({
  loading,
  excelEntities,
  fileName,
  hasAnyNodes,
  target,
  onTargetChange,
  isOverlay,
  onClose,
}: Props) {
  const treeData = useMemo(() => {
    const { sheets, tables } = excelEntities;

    const categoryChildren: any[] = [];

    if (sheets.length > 0) {
      categoryChildren.push({
        title: 'Sheets',
        key: 'group:sheets',
        selectable: false,
        children: sheets.map((s) => ({
          title: s,
          key: `sheet:${s}`,
          isLeaf: true,
          icon: (
            <Icon
              className="text-text-secondary w-4.5"
              component={() => <FileIcon />}
            />
          ),
        })),
        icon: (
          <Icon
            className="text-text-secondary w-4.5"
            component={() => <FileIcon />}
          />
        ),
      });
    }

    if (tables.length > 0) {
      categoryChildren.push({
        title: 'Tables',
        key: 'group:tables',
        selectable: false,
        children: tables.map((t) => ({
          title: t,
          key: `table:${t}`,
          isLeaf: true,
          icon: (
            <Icon
              className="text-text-secondary w-4.5"
              component={() => <TableIcon />}
            />
          ),
        })),
        icon: (
          <Icon
            className="text-text-secondary w-4.5"
            component={() => <TableIcon />}
          />
        ),
      });
    }

    const rootNode = {
      key: 'file:root',
      title: fileName,
      isLeaf: false,
      selectable: false,
      children: categoryChildren,
      icon: (
        <Icon
          className="text-stroke-accent-secondary w-4.5"
          component={() => <XLSFileIcon />}
        />
      ),
    };

    return [rootNode];
  }, [excelEntities, fileName]);

  const selectedKeys = useMemo(() => {
    if (!target) return [];

    return [`${target.kind}:${target.name}`];
  }, [target]);

  return (
    <div
      className={cx(
        'h-full bg-bg-layer-3 border-r border-stroke-primary ',
        isOverlay ? 'w-full' : 'w-70 shrink-0',
      )}
    >
      <div className="h-full p-3">
        <div className="h-full min-h-0 flex flex-col gap-2">
          {isOverlay && (
            <div className="flex items-center justify-between gap-3 mb-1 shrink-0">
              <div className="min-w-0 text-[13px] font-medium text-text-primary truncate">
                {fileName}
              </div>
              <button
                className="inline-flex items-center h-7 px-2 text-[12px] text-text-secondary"
                type="button"
                onClick={onClose}
              >
                <Icon className="w-5 h-5" component={() => <CloseIcon />} />
              </button>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar select-none pr-1">
            {hasAnyNodes && (
              <Tree.DirectoryTree
                selectedKeys={selectedKeys}
                switcherIcon={
                  <Icon
                    className="text-text-secondary w-2"
                    component={() => <DownOutlinedIcon />}
                  />
                }
                treeData={treeData}
                defaultExpandAll
                onSelect={(keys) => {
                  const key = String(keys?.[0] ?? '');
                  if (!key) return;

                  if (key.startsWith('sheet:')) {
                    onTargetChange({
                      kind: 'sheet',
                      name: key.slice('sheet:'.length),
                    });
                    onClose?.();
                  } else if (key.startsWith('table:')) {
                    onTargetChange({
                      kind: 'table',
                      name: key.slice('table:'.length),
                    });
                    onClose?.();
                  }
                }}
              />
            )}

            {!hasAnyNodes && !loading && (
              <div className="text-[13px] text-text-secondary">
                <div className="font-medium text-text-primary">
                  No sheets or tables
                </div>
                <div className="mt-1">
                  This Excel file doesn’t contain any sheets or tables.
                </div>
              </div>
            )}
          </div>

          <hr className="my-1 border-stroke-primary shrink-0" />

          {target?.kind === 'sheet' && (
            <div className="rounded-[3px] p-3 border bg-bg-accent-primary-alpha border-stroke-accent-primary shrink-0">
              <div className="flex gap-2">
                <Icon
                  className="text-text-accent-primary w-6 h-6 shrink-0 mt-0.5"
                  component={() => <ExclamationCircleIcon />}
                />
                <div className="flex flex-col gap-1">
                  <div className="text-[13px] font-medium text-text-primary">
                    Tip
                  </div>
                  <div className="text-[13px] text-text-secondary">
                    Select a range in the spreadsheet preview. We&#39;ll create
                    a new table from that range.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="h-2 shrink-0" />
        </div>
      </div>
    </div>
  );
}
