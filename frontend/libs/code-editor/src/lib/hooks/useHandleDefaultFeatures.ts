import { useEffect, useState } from 'react';

import { editor, IDisposable, KeyCode, KeyMod } from '../monaco';
import { CodeEditorPlace, CodeEditorProps } from '../types';

type Props = {
  codeEditor?: editor.IStandaloneCodeEditor;
  codeEditorPlace: CodeEditorPlace;
  makeCallback: (type: any) => void;
};

export function useHandleDefaultFeatures({
  codeEditor,
  codeEditorPlace,
  makeCallback,
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
}: Props & Partial<CodeEditorProps>) {
  const [disposeFindAction, setDisposeFindAction] = useState<IDisposable>();
  const [disposeHelpAction, setDisposeHelpAction] = useState<IDisposable>();
  const [disposeEnterAction, setDisposeEnterAction] = useState<IDisposable>();
  const [disposeTabAction, setDisposeTabAction] = useState<IDisposable>();
  const [disposeRightArrowAction, setDisposeRightArrowAction] =
    useState<IDisposable>();
  const [disposeLeftArrowAction, setDisposeLeftArrowAction] =
    useState<IDisposable>();
  const [disposeTopArrowAction, setDisposeTopArrowAction] =
    useState<IDisposable>();
  const [disposeBottomArrowAction, setDisposeBottomArrowAction] =
    useState<IDisposable>();

  useEffect(() => {
    // With addAction() we can dispose the action if needed unlike the addCommand()
    // This needed when formula bar is expanded and enter key needs to play default role
    // when formula bar is collapsed, we need to add the onEnter action back to save code
    // *precondition* parameter is used to avoid the action when suggestion widget is open
    if (!onEnter && disposeEnterAction) {
      disposeEnterAction.dispose();
      setDisposeEnterAction(undefined);

      return;
    }

    if (onEnter && !disposeEnterAction && codeEditor) {
      const disposeOnEnter = codeEditor.addAction({
        id: 'onEnter',
        label: 'onEnter',
        keybindings: [KeyCode.Enter],
        precondition: '!suggestWidgetVisible',
        run: () => {
          makeCallback('onEnter');
        },
      });

      setDisposeEnterAction(disposeOnEnter);

      return;
    }
  }, [codeEditor, disposeEnterAction, makeCallback, onEnter]);

  useEffect(() => {
    const needReplaceAction = codeEditorPlace === 'cellEditor';

    if (!needReplaceAction || !codeEditor) return;

    if (!onTab && disposeTabAction) {
      disposeTabAction.dispose();
      setDisposeTabAction(undefined);

      return;
    }

    if (onTab && !disposeTabAction && codeEditor) {
      const disposeOnTab = codeEditor.addAction({
        id: 'onTab',
        label: 'onTab',
        keybindings: [KeyCode.Tab],
        precondition: '!suggestWidgetVisible && !inlineSuggestionVisible',
        run: () => {
          makeCallback('onTab');
        },
      });

      setDisposeTabAction(disposeOnTab);

      return;
    }
  }, [codeEditor, codeEditorPlace, disposeTabAction, makeCallback, onTab]);

  useEffect(() => {
    const needReplaceAction = codeEditorPlace === 'cellEditor';

    if (!needReplaceAction || !codeEditor) return;

    if (!onRightArrow && disposeRightArrowAction) {
      disposeRightArrowAction.dispose();
      setDisposeRightArrowAction(undefined);

      return;
    }

    if (onRightArrow && !disposeRightArrowAction && codeEditor) {
      const disposeOnRightArrow = codeEditor.addAction({
        id: 'onRightArrow',
        label: 'onRightArrow',
        keybindings: [KeyCode.RightArrow],
        precondition: '!suggestWidgetVisible',
        run: () => {
          makeCallback('onRightArrow');
        },
      });

      setDisposeRightArrowAction(disposeOnRightArrow);

      return;
    }
  }, [
    codeEditor,
    codeEditorPlace,
    disposeRightArrowAction,
    makeCallback,
    onRightArrow,
  ]);

  useEffect(() => {
    const needReplaceAction = codeEditorPlace === 'cellEditor';

    if (!needReplaceAction || !codeEditor) return;

    if (!onLeftArrow && disposeLeftArrowAction) {
      disposeLeftArrowAction.dispose();
      setDisposeLeftArrowAction(undefined);

      return;
    }

    if (onLeftArrow && !disposeLeftArrowAction && codeEditor) {
      const disposeOnLeftArrow = codeEditor.addAction({
        id: 'onLeftArrow',
        label: 'onLeftArrow',
        keybindings: [KeyCode.LeftArrow],
        precondition: '!suggestWidgetVisible',
        run: () => {
          makeCallback('onLeftArrow');
        },
      });

      setDisposeLeftArrowAction(disposeOnLeftArrow);

      return;
    }
  }, [
    codeEditor,
    codeEditorPlace,
    disposeLeftArrowAction,
    makeCallback,
    onLeftArrow,
  ]);

  useEffect(() => {
    const needReplaceAction = codeEditorPlace === 'cellEditor';

    if (!needReplaceAction || !codeEditor) return;

    if (!onTopArrow && disposeTopArrowAction) {
      disposeTopArrowAction.dispose();
      setDisposeTopArrowAction(undefined);

      return;
    }

    if (onTopArrow && !disposeTopArrowAction && codeEditor) {
      const disposeOnTopArrow = codeEditor.addAction({
        id: 'onTopArrow',
        label: 'onTopArrow',
        keybindings: [KeyCode.UpArrow],
        precondition: '!suggestWidgetVisible',
        run: () => {
          makeCallback('onTopArrow');
        },
      });

      setDisposeTopArrowAction(disposeOnTopArrow);

      return;
    }
  }, [
    codeEditor,
    codeEditorPlace,
    disposeTopArrowAction,
    makeCallback,
    onTopArrow,
  ]);

  useEffect(() => {
    const needReplaceAction = codeEditorPlace === 'cellEditor';

    if (!needReplaceAction || !codeEditor) return;

    if (!onBottomArrow && disposeBottomArrowAction) {
      disposeBottomArrowAction.dispose();
      setDisposeBottomArrowAction(undefined);

      return;
    }

    if (onBottomArrow && !disposeBottomArrowAction && codeEditor) {
      const disposeOnBottomArrow = codeEditor.addAction({
        id: 'onBottomArrow',
        label: 'onBottomArrow',
        keybindings: [KeyCode.DownArrow],
        precondition: '!suggestWidgetVisible',
        run: () => {
          makeCallback('onBottomArrow');
        },
      });

      setDisposeBottomArrowAction(disposeOnBottomArrow);

      return;
    }
  }, [
    codeEditor,
    codeEditorPlace,
    disposeBottomArrowAction,
    makeCallback,
    onBottomArrow,
  ]);

  // Replace ctrl+enter event for cell editor
  useEffect(() => {
    const needReplaceAction = codeEditorPlace === 'cellEditor';

    if (!onCtrlEnter || !needReplaceAction || !codeEditor) return;

    codeEditor.addAction({
      id: 'replaceCtrlEnter',
      label: 'replaceCtrlEnter',
      keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
      run: () => {
        makeCallback('onCtrlEnter');
      },
    });
  }, [codeEditor, codeEditorPlace, makeCallback, onCtrlEnter]);

  // Change shift+enter to alt+enter shortcut for formula bar and cell editor
  useEffect(() => {
    const needReplaceAction =
      codeEditorPlace === 'formulaBar' || codeEditorPlace === 'cellEditor';

    if (!needReplaceAction || !codeEditor) return;

    codeEditor.addAction({
      id: 'disableDefaultNextLine',
      label: 'disableDefaultNextLine',
      keybindings: [KeyMod.Shift | KeyCode.Enter],
      run: () => {},
    });

    codeEditor.addAction({
      id: 'onNextLine',
      label: 'onNextLine',
      keybindings: [KeyMod.Alt | KeyCode.Enter],
      run: () => {
        const action = codeEditor.getAction('editor.action.insertLineAfter');

        if (!action) return;

        action.run();
      },
    });
  }, [codeEditor, codeEditorPlace]);

  // Disable ctrl+F shortcut for formula bar and cell editor
  useEffect(() => {
    const disableAction =
      codeEditorPlace === 'formulaBar' || codeEditorPlace === 'cellEditor';

    if (!disableAction && disposeFindAction) {
      disposeFindAction.dispose();
      setDisposeFindAction(undefined);

      return;
    }

    if (disableAction && !disposeFindAction && codeEditor) {
      const onFind = codeEditor.addAction({
        id: 'onFind',
        label: 'onFind',
        keybindings: [KeyMod.CtrlCmd | KeyCode.KeyF, KeyCode.F3],
        run: () => {},
      });

      setDisposeFindAction(onFind);

      return;
    }
  }, [codeEditor, disposeFindAction, codeEditorPlace, onEnter]);

  // Disable F1 shortcut for formula bar and cell editor
  useEffect(() => {
    const disableAction =
      codeEditorPlace === 'formulaBar' || codeEditorPlace === 'cellEditor';

    if (!disableAction && disposeHelpAction) {
      disposeHelpAction.dispose();
      setDisposeHelpAction(undefined);

      return;
    }

    if (disableAction && !disposeHelpAction && codeEditor) {
      const onHelp = codeEditor.addAction({
        id: 'onHelp',
        label: 'onHelp',
        keybindings: [KeyCode.F1],
        run: () => {},
      });

      setDisposeHelpAction(onHelp);

      return;
    }
  }, [codeEditor, disposeHelpAction, codeEditorPlace, onEnter]);

  // Add custom action for Escape key
  useEffect(() => {
    if (!codeEditor || !onEscape) return;

    codeEditor.addAction({
      id: 'onEsc',
      label: 'onEsc',
      keybindings: [KeyCode.Escape],
      precondition:
        '!suggestWidgetVisible && !parameterHintsVisible && !inlineSuggestionVisible',
      run: () => {
        makeCallback('onEscape');
      },
    });
  }, [codeEditor, makeCallback, onEscape]);

  // Add custom action for ctrl+Z shortcut
  useEffect(() => {
    if (!codeEditor || !onUndo) return;

    codeEditor.addAction({
      id: 'onUndo',
      label: 'onUndo',
      keybindings: [KeyMod.CtrlCmd | KeyCode.KeyZ],
      run: () => {
        makeCallback('onUndo');
      },
    });
  }, [codeEditor, makeCallback, onUndo]);

  // Add custom action for ctrl+Y and ctrl+shift+Z shortcut
  useEffect(() => {
    if (!codeEditor || !onRedo) return;

    codeEditor.addAction({
      id: 'onRedo',
      label: 'onRedo',
      keybindings: [
        KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyZ,
        KeyMod.CtrlCmd | KeyCode.KeyY,
      ],
      run: () => {
        makeCallback('onRedo');
      },
    });
  }, [codeEditor, makeCallback, onRedo]);
}
