import { InputRef } from 'antd';
import { RefObject, useCallback, useContext, useRef } from 'react';

import { AppContext } from '../../../context';

type Props = {
  onPanelAutoResize: (size: number) => void;
  inputRef: RefObject<InputRef>;
};

export function useFormulaBarHeaderAutoExtend({
  onPanelAutoResize,
  inputRef,
}: Props) {
  const { formulaBarExpanded } = useContext(AppContext);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const triggerAutoExtend = useCallback(
    (newValue: string, oldValue: string) => {
      if (
        formulaBarExpanded ||
        !inputRef.current?.input ||
        newValue.length <= oldValue.length
      )
        return;

      const { width } = inputRef.current.input.getBoundingClientRect();

      let canvas = canvasRef.current;

      if (!canvas) {
        canvas = document.createElement('canvas');
        canvasRef.current = canvas;
      }

      const context = canvas.getContext('2d');

      if (!context) return;

      context.font = '13px Inter, sans-serif';
      const metrics = context.measureText(newValue);
      const inputPadding = 11 * 2;
      const fullTextWidth = metrics.width + inputPadding;

      if (fullTextWidth <= width) return;

      onPanelAutoResize(fullTextWidth);
    },
    [formulaBarExpanded, inputRef, onPanelAutoResize]
  );

  return { triggerAutoExtend };
}
