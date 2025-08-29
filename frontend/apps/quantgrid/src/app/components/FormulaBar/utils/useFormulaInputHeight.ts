import { RefObject, useContext, useEffect, useMemo, useState } from 'react';
import { debounce } from 'ts-debounce';

import { getPx } from '@frontend/canvas-spreadsheet';

import { AppContext } from '../../../context';

const defaultHeight = 29;
const largeHeight = 41;
const expandedHeight = 100;
const notStrictWidthOffset = 2;

export function useFormulaInputHeight(containerRef: RefObject<HTMLDivElement>) {
  const { formulaBarExpanded } = useContext(AppContext);

  const [height, setHeight] = useState(defaultHeight);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(
      debounce((records: ResizeObserverEntry[], _) => {
        records.forEach((record) => {
          if (!record.target.parentElement) return;

          const { width } = record.target.parentElement.getBoundingClientRect();

          const adjustedHeight =
            record.target.scrollWidth - notStrictWidthOffset > width
              ? largeHeight
              : defaultHeight;

          if (adjustedHeight === height) return;

          setHeight(adjustedHeight);
        });
      }, 500)
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, height]);

  const containerHeight = useMemo(
    () => getPx(formulaBarExpanded ? height + expandedHeight : height),
    [formulaBarExpanded, height]
  );

  return {
    height,
    containerHeight,
  };
}
