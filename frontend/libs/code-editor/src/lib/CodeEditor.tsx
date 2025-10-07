import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import {
  CodeEditorContext,
  getDataScroller,
  isFeatureFlagEnabled,
} from '@frontend/common';
import { SheetReader } from '@frontend/parser';
import Editor, { loader, Monaco } from '@monaco-editor/react';

import {
  codeEditorOptions,
  codeEditorTheme,
  CustomCommands,
} from './codeEditorConfig';
import { registerQuantgridLanguage } from './codeEditorFunctions';
import { registerTheme } from './codeEditorTheme';
import {
  useEditorRegisterProviders,
  useHandleDefaultFeatures,
  useInlineSuggestions,
} from './hooks';
import { editor, IPosition, KeyCode, KeyMod, monaco } from './monaco';
import {
  getFieldAtPosition,
  getTableAtPosition,
} from './providers/completionProvider/utils';
import { canEnablePointAndClick, getCursorOffset } from './services';
import { CodeEditorCallbacks, CodeEditorProps } from './types';

import './styles.css';

loader.config({ monaco });

export function CodeEditor({
  language,
  theme,
  codeEditorPlace,
  onEditorReady,
  onEscape,
  onCodeChange,
  onSaveButton,
  onUndo,
  onRedo,
  onEnter,
  onTab,
  onStartPointClick,
  onStopPointClick,
  onRightArrow,
  onLeftArrow,
  onBottomArrow,
  onTopArrow,
  onCtrlEnter,
  onBlur,
  onFocus,
  onGoToTable,
  onGoToField,
  options = {},
  errors = [],
  functions = [],
  inputFiles = [],
  parsedSheets = {},
  disableHelpers = false,
  setCode,
  setFocus,
  sheetContent = '',
  currentTableName,
  currentFieldName,
}: CodeEditorProps) {
  const {
    selectedError,
    updateSelectedError,
    initialOffset,
    updateInitialOffset,
    setCodeEditorInstance,
  } = useContext(CodeEditorContext);

  const [monaco, setMonaco] = useState<Monaco | undefined>(undefined);
  const [codeEditor, setCodeEditor] = useState<
    editor.IStandaloneCodeEditor | undefined
  >(undefined);

  useInlineSuggestions({
    isEnabled: isFeatureFlagEnabled('copilotAutocomplete'),
    monaco,
    codeEditorPlace,
    disableHelpers,
    language,
    functions,
    sheetContent,
    currentTableName,
    currentFieldName,
  });

  const callbacks = useRef<CodeEditorCallbacks>({
    onSaveButton,
    onEnter,
    onTab,
    onRightArrow,
    onLeftArrow,
    onBottomArrow,
    onTopArrow,
    onCtrlEnter,
    onUndo,
    onRedo,
    onEscape,
    onGoToTable,
    onGoToField,
  });

  useEffect(() => {
    callbacks.current = {
      onSaveButton,
      onEnter,
      onTab,
      onRightArrow,
      onLeftArrow,
      onBottomArrow,
      onTopArrow,
      onCtrlEnter,
      onRedo,
      onUndo,
      onEscape,
      onGoToTable,
      onGoToField,
    };
  }, [
    onSaveButton,
    onEnter,
    onTab,
    onRightArrow,
    onLeftArrow,
    onBottomArrow,
    onTopArrow,
    onCtrlEnter,
    onRedo,
    onUndo,
    onEscape,
    onGoToTable,
    onGoToField,
  ]);

  const makeCallback = useCallback(
    (
      callback:
        | 'onEnter'
        | 'onEscape'
        | 'onUndo'
        | 'onRedo'
        | 'onTab'
        | 'onRightArrow'
        | 'onCtrlEnter'
    ) => {
      callbacks.current[callback]?.();
    },
    []
  );

  useEditorRegisterProviders({
    monaco,
    codeEditor,
    codeEditorPlace,
    functions,
    parsedSheets,
    language,
    disableHelpers,
    currentTableName,
    currentFieldName,
    inputFiles: inputFiles || [],
  });

  useHandleDefaultFeatures({
    codeEditor,
    codeEditorPlace,
    onEnter,
    onTab,
    onRightArrow,
    onLeftArrow,
    onTopArrow,
    onBottomArrow,
    onCtrlEnter,
    onEscape,
    onUndo,
    onRedo,
    makeCallback,
  });

  const checkEnablePointAndClick = useCallback(
    (value: string | undefined) => {
      // set timeout because need to wait for monaco focus
      setTimeout(() => {
        if (!codeEditor || !value || !onStartPointClick || !onStopPointClick)
          return;

        if (!codeEditor.hasTextFocus()) return;

        const cursorOffset = getCursorOffset(codeEditor) || 0;

        if (canEnablePointAndClick(value, codeEditor)) {
          onStartPointClick(cursorOffset);
        } else {
          onStopPointClick(cursorOffset);
        }
      }, 0);
    },
    [codeEditor, onStartPointClick, onStopPointClick]
  );

  const setCodeEditorValue = useCallback(
    (value: string, keepHistory = false) => {
      if (codeEditor && codeEditor.getValue() !== value) {
        const model = codeEditor.getModel();

        if (model && keepHistory) {
          const edits = [
            {
              range: model.getFullModelRange(),
              text: value,
              forceMoveMarkers: true,
            },
          ];

          // External edit not allow to change the value
          const isReadOnly = options.readOnly;
          if (isReadOnly) {
            codeEditor.updateOptions({ readOnly: false });
            codeEditor.executeEdits('external-edit', edits);
            codeEditor.updateOptions({ readOnly: true });
          } else {
            codeEditor.executeEdits('external-edit', edits);
          }
        } else {
          codeEditor.setValue(value);
        }

        checkEnablePointAndClick(value);
      }
    },
    [codeEditor, checkEnablePointAndClick, options.readOnly]
  );

  const setEditorFocus = useCallback(
    (
      { cursorOffset }: { cursorOffset?: number | undefined } = {
        cursorOffset: undefined,
      }
    ) => {
      codeEditor?.focus();

      if (cursorOffset) {
        const model = codeEditor?.getModel();

        if (!model) return;

        const length = model.getValueLength();
        codeEditor?.setPosition(
          model.getPositionAt(
            cursorOffset < 0 ? length + cursorOffset : cursorOffset
          )
        );

        return;
      }

      // Set cursor to end by default
      const model = codeEditor?.getModel();

      if (!model) return;

      const lastLine = model.getLineCount();
      const lastColumn = model.getLineMaxColumn(lastLine);
      codeEditor?.setPosition({ lineNumber: lastLine, column: lastColumn });
    },
    [codeEditor]
  );

  const jumpToDSLPosition = useCallback(
    (dslPosition: number) => {
      codeEditor?.focus();

      const model = codeEditor?.getModel();

      if (!model) return;

      const position = model.getPositionAt(dslPosition);
      codeEditor?.setPosition(position);
      codeEditor?.revealLineInCenterIfOutsideViewport(position.lineNumber);
    },
    [codeEditor]
  );

  useEffect(() => {
    if (!setCode) return;

    setCode.current = setCodeEditorValue;
  }, [setCode, setCodeEditorValue]);

  useEffect(() => {
    if (!setFocus) return;

    setFocus.current = setEditorFocus;
  }, [setFocus, setEditorFocus]);

  useEffect(() => {
    if (!codeEditor || codeEditorPlace !== 'codeEditor') {
      return;
    }

    if (initialOffset !== undefined) {
      setTimeout(() => {
        jumpToDSLPosition(initialOffset);
        updateInitialOffset(undefined);
      }, 0);
    }
  }, [
    codeEditor,
    codeEditorPlace,
    initialOffset,
    jumpToDSLPosition,
    updateInitialOffset,
  ]);

  useEffect(() => {
    onEditorReady?.(codeEditor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeEditor]);

  useEffect(() => {
    const onFocusDisposable = codeEditor?.onDidFocusEditorText(() => {
      onFocus?.();
    });

    return () => onFocusDisposable?.dispose();
  }, [codeEditor, onFocus]);

  useEffect(() => {
    const onBlurDisposable = codeEditor?.onDidBlurEditorText(() => {
      // Fix case when closing very custom 'All formulas' widget or open it more than once
      // fires blur event and closes editor
      setTimeout(() => {
        const widget = document.querySelector('.editor-widget.suggest-widget');

        if (!widget) {
          onBlur?.();

          return;
        }

        const isVisible = (widget as HTMLElement).style.display !== 'none';

        if (isVisible) return;

        onBlur?.();
      }, 0);
    });

    return () => onBlurDisposable?.dispose();
  }, [codeEditor, onBlur]);

  useEffect(() => {
    if (codeEditor && selectedError && codeEditorPlace === 'codeEditor') {
      const position: IPosition = {
        lineNumber: selectedError.source.startLine || 1,
        column: selectedError.source.startColumn || 1,
      };

      setTimeout(() => {
        codeEditor.focus();

        codeEditor.setPosition(position);
        codeEditor.revealLineInCenterIfOutsideViewport(position.lineNumber);
        updateSelectedError(null);
      }, 0);
    }
  }, [selectedError, codeEditor, updateSelectedError, codeEditorPlace]);

  useEffect(() => {
    if (!codeEditor || !monaco) return;

    const codeEditorModel = codeEditor.getModel();

    if (codeEditorModel) {
      monaco.editor.setModelMarkers(codeEditorModel, '', errors);
    }
  }, [codeEditor, monaco, errors]);

  useEffect(() => {
    if (!codeEditor) return;

    codeEditor.onDidChangeCursorSelection(() => {
      checkEnablePointAndClick(codeEditor.getValue());
    });

    codeEditor.onDidFocusEditorText(() => {
      checkEnablePointAndClick(codeEditor.getValue());
    });
  }, [checkEnablePointAndClick, codeEditor]);

  const codeChangeCallback = useCallback(
    async (value: string | undefined, _: editor.IModelContentChangedEvent) => {
      if (onCodeChange) onCodeChange(value || '');

      checkEnablePointAndClick(value);
    },
    [onCodeChange, checkEnablePointAndClick]
  );

  /**
   * Hide suggest widget and parameter hints widget on spreadsheet scroll
   * Cause: widgets are not scrolling with cell editor
   */
  useEffect(() => {
    if (codeEditorPlace !== 'cellEditor') return;

    const handleScroll = () => {
      codeEditor?.trigger('', 'hideSuggestWidget', {});
      codeEditor?.trigger('', 'closeParameterHints', {});
    };

    const gridDataScroller = getDataScroller();
    gridDataScroller?.addEventListener('scroll', handleScroll);

    return () => {
      gridDataScroller?.removeEventListener('scroll', handleScroll);
    };
  }, [codeEditor, codeEditorPlace]);

  useEffect(() => {
    if (!monaco) return;

    registerTheme(monaco, theme);
  }, [language, monaco, theme]);

  useEffect(() => {
    if (codeEditorPlace !== 'codeEditor' || !codeEditor) return;

    setCodeEditorInstance(codeEditor);
  }, [codeEditor, codeEditorPlace, setCodeEditorInstance]);

  const onCodeEditorMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      setCodeEditor(editor);
      setMonaco(monaco);

      editor.onDidFocusEditorText(() => {
        editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () =>
          callbacks.current.onSaveButton?.(true)
        );
      });

      monaco.editor.registerCommand(
        CustomCommands.SuggestionInsertFunction,
        (_, modelId: string) => {
          if (!modelId) return;

          const editors = monaco.editor.getEditors();

          // To get Position we need first to get correct editor instance by model id
          const currentEditor = editors.find((e) => {
            const model = e.getModel();

            return model?.id === modelId;
          });

          if (!currentEditor) return;

          const position = currentEditor.getPosition();

          if (!position) return;

          currentEditor.setPosition({
            lineNumber: position.lineNumber,
            column: Math.max(0, position.column - 1),
          });

          currentEditor.getAction('editor.action.triggerParameterHints')?.run();
        }
      );

      monaco.editor.registerCommand(
        CustomCommands.SuggestionAcceptTableOrField,
        (_, modelId: string) => {
          if (!modelId) return;

          const editors = monaco.editor.getEditors();

          // To get Position we need first to get correct editor instance by model id
          const currentEditor = editors.find((e) => {
            const model = e.getModel();

            return model?.id === modelId;
          });

          if (!currentEditor) return;

          currentEditor.trigger('', 'editor.action.triggerSuggest', {});
        }
      );

      // Go to table context menu item
      editor.addAction({
        id: 'go-to-table',
        label: 'Go To Table',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1,
        keybindings: [KeyMod.CtrlCmd | KeyCode.F6],

        run: function (editor) {
          try {
            const dsl = editor.getModel()?.getValue();
            const parsedSheet = SheetReader.parseSheet(dsl);
            const position = editor.getPosition();

            if (!parsedSheet || !position) return;

            const table = getTableAtPosition(parsedSheet, position.lineNumber);

            if (!table) return;

            callbacks.current.onGoToTable?.(table.tableName);
          } catch (error) {
            // empty block
          }
        },
      });

      // Go to field context menu item
      editor.addAction({
        id: 'go-to-column',
        label: 'Go To Column',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 2,

        run: function (editor) {
          try {
            const model = editor.getModel();

            if (!model) return;

            const dsl = model.getValue();
            const parsedSheet = SheetReader.parseSheet(dsl);
            const position = editor.getPosition();

            if (!parsedSheet || !position) return;

            const offset = model.getOffsetAt(position);
            const field = getFieldAtPosition(
              parsedSheet,
              position.lineNumber,
              offset
            );

            if (!field) return;

            const { fieldName, tableName } = field.key;

            callbacks.current.onGoToField?.(tableName, fieldName);
          } catch (error) {
            // empty block
          }
        },
      });
    },
    []
  );

  return (
    <Editor
      beforeMount={(monaco) =>
        registerQuantgridLanguage(monaco, language, theme)
      }
      language={language}
      options={{
        ...codeEditorOptions,
        ...options,
      }}
      theme={codeEditorTheme}
      onChange={codeChangeCallback}
      onMount={onCodeEditorMount}
    />
  );
}

// https://github.com/microsoft/vscode/issues/183324
// Override ResizeObserver to get rid of the ResizeObserver loop limit
// Wait for monaco-editor fix and remove lines below

// Save a reference to the original ResizeObserver
const OriginalResizeObserver = window.ResizeObserver;

// Create a new ResizeObserver constructor
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.ResizeObserver = function (callback) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const wrappedCallback = (entries, observer) => {
    window.requestAnimationFrame(() => {
      callback(entries, observer);
    });
  };

  // Create an instance of the original ResizeObserver
  // with the wrapped callback
  return new OriginalResizeObserver(wrappedCallback);
};

// Copy over static methods, if any
for (const staticMethod in OriginalResizeObserver) {
  if (
    Object.prototype.hasOwnProperty.call(OriginalResizeObserver, staticMethod)
  ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.ResizeObserver[staticMethod] = OriginalResizeObserver[staticMethod];
  }
}
