import cx from 'classnames';
import { useContext, useEffect, useMemo } from 'react';

import { CodeEditor } from '@frontend/code-editor';

import { cellEditorContainerId, cellEditorWrapperId } from '../../constants';
import { CellEditorContext } from './CellEditorContext';
import { CellEditorTooltip } from './CellEditorTooltip';
import {
  useCellEditorCompleteEdit,
  useCellEditorEvents,
  useCellEditorSwitchMode,
  useCellEditorViewport,
  usePointAndClick,
} from './hooks';
import { baseFontSize, baseLineHeight, cellEditorOptions } from './options';
import { Props } from './types';
import { getCellEditorColor, shouldDisableHelpers } from './utils';

export function CellEditor({
  apiRef,
  app,
  gridCallbacksRef,
  functions,
  parsedSheets,
  theme,
  formulaBarMode,
  isPointClickMode,
  sheetContent,
  zoom = 1,
}: Props) {
  const {
    currentFieldName,
    currentTableName,
    editMode,
    editorStyle,
    isOpen,
    mouseOverSwitcherTooltip,
    onCodeChange,
    setCode,
    setCodeEditor,
    setFocus,
  } = useContext(CellEditorContext);

  const { onStartPointClick, onStopPointClick } = usePointAndClick({
    apiRef,
    gridCallbacksRef,
  });
  useCellEditorEvents({
    apiRef,
    app,
    formulaBarMode,
  });
  const {
    onCtrlEnterCallback,
    onSaveCallback,
    onBottomArrowCallback,
    onLeftArrowCallback,
    onRightArrowCallback,
    onTopArrowCallback,
    onTabCallback,
    onEscape,
    onBlur,
  } = useCellEditorCompleteEdit({ apiRef, gridCallbacksRef, isPointClickMode });
  const { switchToSecondaryEditMode } = useCellEditorSwitchMode({ apiRef });
  useCellEditorViewport({ apiRef });

  const disableHelpers = useMemo(
    () => shouldDisableHelpers(editMode),
    [editMode]
  );

  useEffect(() => {
    gridCallbacksRef?.current?.onCellEditorChangeEditMode?.(editMode);
  }, [editMode, gridCallbacksRef]);

  return (
    <div
      className="h-full w-full absolute left-0 top-0 pointer-events-none overflow-hidden z-[305]"
      id={cellEditorContainerId}
    >
      <div
        className={cx(
          'absolute z-[305] outline outline-[1.5px] pointer-events-auto',
          getCellEditorColor(editMode)
        )}
        id={cellEditorWrapperId}
        style={{ display: isOpen ? 'block' : 'none', ...editorStyle }}
      >
        {editMode && (
          <CellEditorTooltip
            bottomOffset={editorStyle.height}
            editMode={editMode}
            mouseOverSwitcherTooltip={mouseOverSwitcherTooltip}
            zoom={zoom}
            onCloseTooltip={() => setFocus.current?.()}
            onSecondaryEditModeSwitch={switchToSecondaryEditMode}
          />
        )}
        <CodeEditor
          codeEditorPlace="cellEditor"
          currentFieldName={currentFieldName}
          currentTableName={currentTableName}
          disableHelpers={disableHelpers}
          functions={functions}
          language="cell-editor"
          options={{
            ...cellEditorOptions,
            fontSize: baseFontSize * zoom,
            lineHeight: baseLineHeight * zoom,
          }}
          parsedSheets={parsedSheets}
          setCode={setCode}
          setFocus={setFocus}
          sheetContent={sheetContent}
          theme={theme}
          onBlur={onBlur}
          onBottomArrow={onBottomArrowCallback}
          onCodeChange={onCodeChange}
          onCtrlEnter={onCtrlEnterCallback}
          onEditorReady={setCodeEditor}
          onEnter={onSaveCallback}
          onEscape={onEscape}
          onLeftArrow={onLeftArrowCallback}
          onRightArrow={onRightArrowCallback}
          onSaveButton={onSaveCallback}
          onStartPointClick={onStartPointClick}
          onStopPointClick={onStopPointClick}
          onTab={onTabCallback}
          onTopArrow={onTopArrowCallback}
        />
      </div>
    </div>
  );
}
