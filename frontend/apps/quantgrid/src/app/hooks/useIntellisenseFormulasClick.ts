import { useCallback, useContext, useEffect, useRef } from 'react';

import { LayoutContext } from '../context';

export const useIntellisenseFormulasClick = (
  triggerFormulaDropdown: (
    value: { x: number; y: number } | undefined,
    triggerContext: 'CodeEditor' | 'FormulaBar' | 'CellEditor'
  ) => void
) => {
  const { openedPanels } = useContext(LayoutContext);

  const listeners = useRef<[Node, EventListener][]>([]);
  const handleClick = useCallback(
    (e: Event, triggerContext: 'CodeEditor' | 'FormulaBar' | 'CellEditor') => {
      triggerFormulaDropdown(
        {
          x: (e as MouseEvent).clientX,
          y: (e as MouseEvent).clientY,
        },
        triggerContext
      );

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    },
    [triggerFormulaDropdown]
  );

  const createSuggestionsLeftElement = useCallback(() => {
    const el = document.createElement('div');

    const hintEl = document.createElement('span');
    hintEl.textContent = 'Tab/Enter to apply, Esc to close.';
    hintEl.classList.add('hint');

    const formulaButtonEl = document.createElement('button');
    formulaButtonEl.textContent = '↗ All formulas';
    formulaButtonEl.classList.add('formulas-trigger');

    el.appendChild(hintEl);
    el.appendChild(formulaButtonEl);

    return el;
  }, []);

  useEffect(() => {
    // Options for the observer (which mutations to observe)
    const config: MutationObserverInit = { childList: true, subtree: true };

    // Callback function to execute when mutations are observed
    const callback: MutationCallback = (mutationList) => {
      for (const mutation of mutationList) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;

          if (!node.parentElement) return;

          const genNode = node.parentElement.querySelector(
            '.suggest-widget .monaco-action-bar.left'
          );

          if (
            genNode &&
            !genNode.classList.contains('generated-suggest-hint')
          ) {
            const isCellEditor =
              node.parentElement.querySelector(
                '[data-mode-id="cell-editor"] .suggest-widget .monaco-action-bar.left'
              ) === genNode;
            const isFormulaBar =
              !isCellEditor &&
              node.parentElement.querySelector(
                '[data-mode-id="formula-bar"] .suggest-widget .monaco-action-bar.left'
              ) === genNode;

            const newNode = createSuggestionsLeftElement();
            (newNode as HTMLElement).classList.add('generated-suggest-hint');

            genNode.parentElement?.replaceChild(newNode, genNode);
            const addedNode = node.parentElement.querySelector(
              '.generated-suggest-hint'
            );

            if (addedNode) {
              const clickWithParam = (e: Event) =>
                handleClick(
                  e,
                  isCellEditor
                    ? 'CellEditor'
                    : isFormulaBar
                    ? 'FormulaBar'
                    : 'CodeEditor'
                );
              addedNode.addEventListener('click', clickWithParam, true);
              listeners.current.push([addedNode, clickWithParam]);
            }
          }
        });
      }
    };

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback);

    setTimeout(() => {
      // Select the node that will be observed for mutations
      const targetNodes = document.querySelectorAll('.monaco-editor');

      targetNodes.forEach((targetNode) => {
        // Start observing the target node for configured mutations
        observer.observe(targetNode, config);
      });
    }, 500);

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      listeners.current.forEach(([el, listener]) =>
        el.removeEventListener('click', listener)
      );
      listeners.current = [];
      observer.disconnect();
    };
  }, [createSuggestionsLeftElement, handleClick, openedPanels]);
};
