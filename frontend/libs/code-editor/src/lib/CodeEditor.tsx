import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { CodeEditorContext } from '@frontend/common';
import Editor, { loader, Monaco } from '@monaco-editor/react';

import { codeEditorConfig } from './codeEditorConfig';
import { registerQuantgridLanguage } from './codeEditorFunctions';
import { useEditorRegisterProviders } from './hooks/useEditorRegisterProviders';
import {
  editor,
  IDisposable,
  IPosition,
  KeyCode,
  KeyMod,
  monacoFromNodeModules,
} from './monaco';
import { CodeEditorProps } from './types';

import './CodeEditor.module.scss';

loader.config({ monaco: monacoFromNodeModules });

export function CodeEditor({
  language,
  onEditorReady,
  onEscape,
  onCodeChange,
  onSaveButton,
  onUndo,
  onRedo,
  onEnter,
  onBlur,
  options = {},
  errors = [],
  functions = [],
  parsedSheets = {},
  isFormulaBar = false,
  disableHelpers = false,
  setCode,
  setFocus,
}: CodeEditorProps) {
  const { selectedError, updateSelectedError } = useContext(CodeEditorContext);
  const [disposeOnEnterAction, setDisposeOnEnterAction] =
    useState<IDisposable>();
  const [monaco, setMonaco] = useState<Monaco | undefined>(undefined);
  const [codeEditor, setCodeEditor] = useState<
    editor.IStandaloneCodeEditor | undefined
  >(undefined);

  useEditorRegisterProviders({
    monaco,
    codeEditor,
    isFormulaBar,
    functions,
    parsedSheets,
    language,
    disableHelpers,
  });

  const setCodeEditorValue = useCallback(
    (value: string) => {
      if (codeEditor && codeEditor.getValue() !== value) {
        codeEditor.setValue(value);
      }
    },
    [codeEditor]
  );

  const setEditorFocus = useCallback(
    (cursorToEnd = false) => {
      codeEditor?.focus();

      if (!cursorToEnd) return;

      const model = codeEditor?.getModel();

      if (!model) return;

      const lastLine = model.getLineCount();
      const lastColumn = model.getLineMaxColumn(lastLine);
      codeEditor?.setPosition({ lineNumber: lastLine, column: lastColumn });
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

  const callbacks = useRef({ onSaveButton, onEnter, onUndo, onRedo, onEscape });

  useEffect(() => {
    callbacks.current = { onSaveButton, onEnter, onRedo, onUndo, onEscape };
  }, [onSaveButton, onEnter, onRedo, onUndo, onEscape]);

  useEffect(() => {
    onEditorReady?.();
  }, [codeEditor, onEditorReady]);

  useEffect(() => {
    const onBlurDisposable = codeEditor?.onDidBlurEditorText(() => {
      onBlur?.();
    });

    return () => onBlurDisposable?.dispose();
  }, [codeEditor, onBlur]);

  useEffect(() => {
    if (codeEditor && selectedError) {
      const position: IPosition = {
        lineNumber: selectedError.line,
        column: selectedError.position || 1,
      };

      codeEditor.focus();
      codeEditor.setPosition(position);
      codeEditor.revealLineInCenterIfOutsideViewport(position.lineNumber);

      updateSelectedError(null);
    }
  }, [selectedError, codeEditor, updateSelectedError]);

  useEffect(() => {
    if (!codeEditor || !monaco) return;

    const codeEditorModel = codeEditor.getModel();

    if (codeEditorModel) {
      monaco.editor.setModelMarkers(codeEditorModel, '', errors);
    }
  }, [codeEditor, monaco, errors]);

  const codeChangeCallback = useCallback(
    async (value: string | undefined, _: editor.IModelContentChangedEvent) => {
      if (onCodeChange) onCodeChange(value || '');
    },
    [onCodeChange]
  );

  const onCodeEditorMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      setCodeEditor(editor);
      setMonaco(monaco);

      editor.onDidFocusEditorText(() => {
        editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () =>
          callbacks.current.onSaveButton?.(true)
        );
      });
    },
    []
  );

  useEffect(() => {
    // With addAction() we can dispose the action if needed unlike the addCommand()
    // This needed when formula bar is expanded and enter key needs to play default role
    // when formula bar is collapsed, we need to add the onEnter action back to save code
    // *precondition* parameter is used to avoid the action when suggestion widget is open
    if (!onEnter && disposeOnEnterAction) {
      disposeOnEnterAction.dispose();
      setDisposeOnEnterAction(undefined);
    } else if (onEnter && !disposeOnEnterAction) {
      const onEnter = codeEditor?.addAction({
        id: 'onEnter',
        label: 'onEnter',
        keybindings: [KeyCode.Enter],
        precondition: '!suggestWidgetVisible && !parameterHintsVisible',
        run: () => {
          callbacks.current.onEnter?.();
        },
      });

      setDisposeOnEnterAction(onEnter);
    }
  }, [codeEditor, disposeOnEnterAction, onEnter]);

  useEffect(() => {
    if (!codeEditor || !onEscape) return;

    codeEditor?.addAction({
      id: 'onEsc',
      label: 'onEsc',
      keybindings: [KeyCode.Escape],
      precondition: '!suggestWidgetVisible && !parameterHintsVisible',
      run: () => {
        callbacks.current.onEscape?.();
      },
    });
  }, [codeEditor, onEscape]);

  useEffect(() => {
    if (!codeEditor || !onUndo) return;

    codeEditor?.addAction({
      id: 'onUndo',
      label: 'onUndo',
      keybindings: [KeyMod.CtrlCmd | KeyCode.KeyZ],
      run: () => {
        callbacks.current.onUndo?.();
      },
    });
  }, [codeEditor, onUndo]);

  useEffect(() => {
    if (!codeEditor || !onRedo) return;

    codeEditor?.addAction({
      id: 'onRedo',
      label: 'onRedo',
      keybindings: [
        KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyZ,
        KeyMod.CtrlCmd | KeyCode.KeyY,
      ],
      run: () => {
        callbacks.current.onRedo?.();
      },
    });
  }, [codeEditor, onRedo]);

  return (
    <Editor
      beforeMount={(monaco) => registerQuantgridLanguage(monaco, language)}
      language={language}
      options={{
        ...codeEditorConfig.options,
        ...options,
      }}
      theme={codeEditorConfig.theme}
      onChange={codeChangeCallback}
      onMount={onCodeEditorMount}
    />
  );
}
