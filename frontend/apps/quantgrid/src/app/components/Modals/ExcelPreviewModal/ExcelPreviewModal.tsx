import { Modal } from 'antd';
import cx from 'classnames';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SelectionEdges } from '@frontend/canvas-spreadsheet';
import {
  defaultTableName,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
  xlsFileExtension,
  xlsxFileExtension,
} from '@frontend/common';

import { useApiRequests, useRequestDimTable } from '../../../hooks';
import { useExcelPreviewStore } from '../../../store';
import { displayToast, encodeApiUrl } from '../../../utils';
import { ExcelPreviewModalBody } from './Components';
import { ExcelPreviewCanvasContextProvider } from './ExcelPreviewCanvasContext';
import { ExcelPreviewViewportContextProvider } from './ExcelPreviewViewportContext';
import {
  ExcelEntities,
  ExcelTarget,
  formatSelectionA1,
  pickDefaultTarget,
} from './utils';

export function ExcelPreviewModal() {
  const { getExcelCatalog } = useApiRequests();
  const { requestDimSchemaForFormula } = useRequestDimTable();

  const isOpen = useExcelPreviewStore((s) => s.isOpen);
  const close = useExcelPreviewStore((s) => s.close);

  const col = useExcelPreviewStore((s) => s.col);
  const row = useExcelPreviewStore((s) => s.row);
  const createInNewSheet = useExcelPreviewStore((s) => s.createInNewSheet);
  const file = useExcelPreviewStore((s) => s.file);
  const [excelEntities, setExcelEntities] = useState<ExcelEntities>({
    sheets: [],
    tables: [],
  });
  const [target, setTarget] = useState<ExcelTarget>(null);
  const [selection, setSelection] = useState<SelectionEdges | null>(null);
  const [withHeaders, setWithHeaders] = useState(false);
  const [isRangeEditorOpen, setIsRangeEditorOpen] = useState(false);
  const [maskClosable, setMaskClosable] = useState(true);

  const inertRootRef = useRef<HTMLDivElement | null>(null);

  const fileName = useMemo(() => file?.name || '', [file]);

  const fileUrl = useMemo(() => file?.url || null, [file?.url]);

  const previewPath = useMemo(() => {
    if (!fileUrl || !target) return null;

    const encodedName = encodeApiUrl(target.name);
    const targetPart =
      target.kind === 'sheet'
        ? `?sheet=${encodedName}`
        : `?table=${encodedName}`;

    return `${fileUrl}${targetPart}`;
  }, [fileUrl, target]);

  const hasAnyNodes =
    excelEntities.sheets.length > 0 || excelEntities.tables.length > 0;

  const [loading, setLoading] = useState(false);

  const initExcelPreview = useCallback(async () => {
    if (!fileUrl) return;

    setLoading(true);
    const res = await getExcelCatalog({ path: fileUrl });

    setLoading(false);

    if (!res.success) {
      displayToast('error', 'Failed to load Excel sheets/tables');
      setExcelEntities({ sheets: [], tables: [] });
      setTarget(null);

      return;
    }

    setExcelEntities(res.data);
    setTarget(pickDefaultTarget(res.data));
  }, [fileUrl, getExcelCatalog]);

  const handleCreateTable = useCallback(() => {
    const newTableName = (fileName || defaultTableName)
      .replaceAll(xlsxFileExtension, '')
      .replaceAll(xlsFileExtension, '');
    const isSheet = target?.kind === 'sheet';
    const range =
      isSheet && selection ? `&range=${formatSelectionA1(selection)}` : '';
    const headers = isSheet && withHeaders ? '&headers=true' : '';
    const formula = `${newTableName} = INPUT("${previewPath}${range}${headers}")`;

    const finalCol = col !== null ? col : 0;
    const finalRow = row !== null ? row : 0;

    requestDimSchemaForFormula(finalCol, finalRow, formula, createInNewSheet);

    close();
  }, [
    close,
    col,
    createInNewSheet,
    fileName,
    previewPath,
    requestDimSchemaForFormula,
    row,
    selection,
    target?.kind,
    withHeaders,
  ]);

  useEffect(() => {
    if (!isOpen || !fileUrl) return;

    setExcelEntities({ sheets: [], tables: [] });
    setTarget(null);
    setSelection(null);
    setWithHeaders(false);

    initExcelPreview();
  }, [fileUrl, isOpen, initExcelPreview]);

  // This effect makes modal content inert to be able to interact with the range editor (in the popover)
  // setTimeout to ensure the popover is closed
  useEffect(() => {
    setTimeout(() => {
      const el = inertRootRef.current;
      if (!el) return;

      if (isRangeEditorOpen) el.setAttribute('inert', '');
      else el.removeAttribute('inert');

      setMaskClosable(!isRangeEditorOpen);
    }, 1000);
  }, [isRangeEditorOpen]);

  const title = useMemo(
    () => `Import from Excel: ${fileName || ''}`,
    [fileName],
  );

  const okButtonDisabled = useMemo(() => {
    if (target?.kind === 'table') return false;

    return !hasAnyNodes || !previewPath;
  }, [hasAnyNodes, previewPath, target?.kind]);

  return (
    <Modal
      cancelButtonProps={{
        className: cx(modalFooterButtonClasses, secondaryButtonClasses),
      }}
      centered={true}
      className={cx('w-[95vw]! md:w-[90vw]! max-w-[95vw]')}
      destroyOnHidden={true}
      maskClosable={maskClosable}
      modalRender={(node) => <div ref={inertRootRef}>{node}</div>}
      okButtonProps={{
        className: cx(
          modalFooterButtonClasses,
          primaryButtonClasses,
          primaryDisabledButtonClasses,
        ),
        disabled: okButtonDisabled,
      }}
      okText="Create table"
      open={isOpen}
      style={{
        minHeight: '80vh',
      }}
      title={title}
      onCancel={close}
      onOk={handleCreateTable}
    >
      <ExcelPreviewCanvasContextProvider>
        <ExcelPreviewViewportContextProvider>
          <ExcelPreviewModalBody
            excelEntities={excelEntities}
            fileName={fileName}
            loading={loading}
            previewPath={previewPath}
            selection={selection}
            setWithHeaders={setWithHeaders}
            target={target}
            withHeaders={withHeaders}
            onRangeEditorOpenChange={setIsRangeEditorOpen}
            onSelectionChange={setSelection}
            onTargetChange={setTarget}
          />
        </ExcelPreviewViewportContextProvider>
      </ExcelPreviewCanvasContextProvider>
    </Modal>
  );
}
