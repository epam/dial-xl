import { RefObject, useEffect, useState } from 'react';
import { debounce } from 'ts-debounce';

const defaultHeight = 24;
const largeHeight = 41;

export function useFormulaInputHeight(containerRef: RefObject<HTMLDivElement>) {
  const [height, setHeight] = useState(defaultHeight);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(
      debounce((records: ResizeObserverEntry[], _) => {
        records.forEach((record) => {
          if (!record.target.parentElement) return;

          const { width } = record.target.parentElement.getBoundingClientRect();

          const adjustedHeight =
            record.target.scrollWidth > width ? largeHeight : defaultHeight;

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

  return {
    height,
  };
}
