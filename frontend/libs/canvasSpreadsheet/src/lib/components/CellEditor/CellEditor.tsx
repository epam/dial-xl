import cx from 'classnames';
import { useContext, useEffect, useMemo } from 'react';

import { CodeEditor } from '@frontend/code-editor';

import { cellEditorContainerId, cellEditorWrapperId } from '../../constants';
import { GridStateContext } from '../../context';
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
  app,
  eventBus,
  functions,
  parsedSheets,
  theme,
  formulaBarMode,
  isPointClickMode,
  sheetContent,
  inputList = [],
}: Props) {
  const { zoom, getCell } = useContext(GridStateContext);
  const {
    currentFieldName,
    currentTableName,
    editMode,
    editorStyle,
    isOpen,
    mouseOverSwitcherTooltip,
    onCodeChange,
    onContentHeightChange,
    setCode,
    setCodeEditor,
    setFocus,
  } = useContext(CellEditorContext);

  const { onStartPointClick, onStopPointClick } = usePointAndClick({
    eventBus,
  });
  useCellEditorEvents({
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
  } = useCellEditorCompleteEdit({ eventBus, isPointClickMode });
  const { switchToSecondaryEditMode } = useCellEditorSwitchMode({ getCell });
  useCellEditorViewport();

  const disableHelpers = useMemo(
    () => shouldDisableHelpers(editMode),
    [editMode],
  );

  useEffect(() => {
    eventBus.emit({
      type: 'editor/mode-changed',
      payload: editMode,
    });
  }, [editMode, eventBus]);

  return (
    <div
      className="h-full w-full absolute left-0 top-0 pointer-events-none overflow-hidden z-305"
      id={cellEditorContainerId}
    >
      <div
        className={cx(
          'absolute z-305 outline-solid bg-bg-layer-3 pointer-events-auto',
          getCellEditorColor(editMode),
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
          inputFiles={inputList}
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
          onContentHeightChange={onContentHeightChange}
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
