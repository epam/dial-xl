import { useCallback, useEffect, useRef } from 'react';

const isEditableElement = (el: Element | null) => {
  if (!el) return false;
  if (el instanceof HTMLInputElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  const h = el as HTMLElement;

  return h.isContentEditable;
};

export function useClipboardTarget(onPaste: (e: ClipboardEvent) => void) {
  const sinkRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = document.createElement('textarea');
    el.setAttribute('aria-hidden', 'true');
    el.tabIndex = -1;

    // Offscreen element to capture paste events without interfering with user interactions
    Object.assign(el.style, {
      position: 'fixed',
      left: '-9999px',
      top: '0px',
      width: '1px',
      height: '1px',
      opacity: '0',
      pointerEvents: 'none',
    });

    const handlePaste = (e: ClipboardEvent) => {
      onPaste(e);
      el.value = '';
    };

    el.addEventListener('paste', handlePaste);
    document.body.appendChild(el);
    sinkRef.current = el;

    return () => {
      el.removeEventListener('paste', handlePaste);
      el.remove();
      sinkRef.current = null;
    };
  }, [onPaste]);

  const focusClipboardBridge = useCallback(() => {
    const el = sinkRef.current;
    if (!el) return;

    const active = document.activeElement;
    if (active && active !== el && isEditableElement(active)) return;

    el.value = '';
    el.focus({ preventScroll: true });
    el.select();
  }, []);

  return { focusClipboardBridge };
}
