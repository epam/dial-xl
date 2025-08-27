import {
  codeEditorId,
  formulaBarInput,
  formulaEditorId,
  projectTreeId,
} from '../constants';

export function isModalOpen() {
  const modals = document.querySelectorAll(
    '.ant-modal'
  ) as NodeListOf<HTMLElement>;

  for (let i = 0; i < modals.length; i++) {
    const { width, height } = modals[i].getBoundingClientRect();

    if (width && height) {
      return true;
    }
  }

  return false;
}

export const isCodeEditorMonacoInputFocused = (): boolean => {
  const { activeElement } = document;

  if (!activeElement) return false;

  const codeEditorInputContainer = document.getElementById(codeEditorId);
  if (!codeEditorInputContainer) return false;

  // Regular Monaco text-area focus
  const { classList } = activeElement;
  const isMonacoEditorFocused =
    classList.contains('inputarea') &&
    classList.contains('monaco-mouse-cursor-text') &&
    codeEditorInputContainer.contains(activeElement);

  // Focus inside the “find & replace” widget that is rendered inside Monaco
  const findWidget = (activeElement as HTMLElement).closest(
    '.find-widget.replaceToggled'
  ) as HTMLElement | null;
  const isFindWidgetFocused =
    !!findWidget && codeEditorInputContainer.contains(findWidget);

  return isMonacoEditorFocused || isFindWidgetFocused;
};

export const isFormulaBarMonacoInputFocused = (): boolean => {
  const { activeElement } = document;

  if (!activeElement) return false;

  const formulaInputContainer = document.getElementById(formulaEditorId);

  const { classList } = activeElement;
  const isMonacoEditorFocused =
    classList.contains('inputarea') &&
    classList.contains('monaco-mouse-cursor-text');

  return (
    isMonacoEditorFocused && !!formulaInputContainer?.contains(activeElement)
  );
};

export const isFormulaBarInputFocused = (): boolean => {
  const { activeElement } = document;

  if (!activeElement) return false;

  const formulaInputContainer = document.getElementById(formulaBarInput);

  return !!formulaInputContainer?.contains(activeElement);
};

export const isMonacoEditorEvent = (event: KeyboardEvent): boolean => {
  const { classList } = event.target as HTMLElement;

  return (
    classList.contains('inputarea') &&
    classList.contains('monaco-mouse-cursor-text')
  );
};

export const isContextMenuOpen = (): boolean => {
  const contextMenu = document.querySelector(
    '.grid-context-menu'
  ) as HTMLElement;

  if (!contextMenu) return false;

  const { width, height } = contextMenu.getBoundingClientRect();

  return !!width && !!height;
};

export function isProjectTreeTarget(event: any) {
  let target = event.target;
  const projectTree = document.getElementById(projectTreeId);

  while (target) {
    if (target === projectTree) {
      return true;
    }

    target = target.parentNode;
  }

  return false;
}
