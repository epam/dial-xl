import { Spin } from 'antd';
import cx from 'classnames';
import { useEffect, useMemo, useState } from 'react';

import { SelectionEdges } from '@frontend/canvas-spreadsheet';

import { ExcelEntities, ExcelTarget } from '../utils';
import { ExcelPreviewGridHeader } from './ExcelPreviewGridHeader';
import { ExcelPreviewSideBar } from './ExcelPreviewSideBar';
import { ExcelPreviewSpreadsheetWrapper } from './ExcelPreviewSpreadsheetWrapper';

type Props = {
  loading: boolean;
  excelEntities: ExcelEntities;
  target: ExcelTarget;
  fileName: string;
  onTargetChange: (t: ExcelTarget) => void;
  previewPath: string | null;
  withHeaders: boolean;
  setWithHeaders: (withHeaders: boolean) => void;
  selection: SelectionEdges | null;
  onSelectionChange: (s: SelectionEdges | null) => void;
  onRangeEditorOpenChange?: (open: boolean) => void;
};

export function ExcelPreviewModalBody({
  loading,
  excelEntities,
  target,
  fileName,
  onTargetChange,
  previewPath,
  withHeaders,
  selection,
  setWithHeaders,
  onSelectionChange,
  onRangeEditorOpenChange,
}: Props) {
  const hasAnyNodes = useMemo(
    () => excelEntities.sheets.length > 0 || excelEntities.tables.length > 0,
    [excelEntities],
  );

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [target?.kind, target?.name]);

  return (
    <div
      className={cx(
        'relative h-[80vh] rounded-[3px] overflow-hidden flex border border-stroke-primary',
        {
          'pointer-events-none': !hasAnyNodes,
        },
      )}
    >
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg-layer-3/40">
          <Spin size="large" />
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <ExcelPreviewSideBar
          excelEntities={excelEntities}
          fileName={fileName}
          hasAnyNodes={hasAnyNodes}
          loading={loading}
          target={target}
          onTargetChange={onTargetChange}
        />
      </div>

      {/* Mobile sidebar as an overlay drawer */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden absolute inset-0 z-20">
          <button
            aria-label="Close sidebar"
            className={cx(
              'absolute inset-0 bg-black/30 transition-opacity duration-300',
              isMobileSidebarOpen
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0',
            )}
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          <div
            className={cx(
              'absolute left-0 top-0 h-full w-[80vw] max-w-[320px] shadow-xl transform-gpu',
              'transition-transform duration-300 ease-out',
              isMobileSidebarOpen
                ? 'translate-x-0 pointer-events-auto'
                : '-translate-x-full',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <ExcelPreviewSideBar
              excelEntities={excelEntities}
              fileName={fileName}
              hasAnyNodes={hasAnyNodes}
              loading={loading}
              target={target}
              isOverlay
              onClose={() => setIsMobileSidebarOpen(false)}
              onTargetChange={onTargetChange}
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <ExcelPreviewGridHeader
          selection={selection}
          setWithHeaders={setWithHeaders}
          target={target}
          withHeaders={withHeaders}
          onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          onRangeEditorOpenChange={onRangeEditorOpenChange}
          onSelectionChanged={onSelectionChange}
        />

        <div className="flex-1 min-h-0 relative">
          <div className="w-full h-full">
            <ExcelPreviewSpreadsheetWrapper
              path={previewPath}
              target={target}
              onSelectionChanged={onSelectionChange}
            />
          </div>

          {!hasAnyNodes && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-layer-3/65">
              <div className="text-center">
                <div className="text-[13px] font-medium text-text-primary">
                  This Excel file has no sheets or tables
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
