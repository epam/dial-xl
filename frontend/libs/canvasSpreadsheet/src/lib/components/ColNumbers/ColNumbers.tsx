import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { Container } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { ColNumber } from './ColNumber';

export function ColNumbers() {
  const { getBitmapFontName, theme } = useContext(GridStateContext);
  const { viewportEdges, gridViewportSubscriber } =
    useContext(GridViewportContext);

  const [colNumbers, setColNumbers] = useState<{ col: number; row: number }[]>(
    []
  );

  const fontName = useMemo(() => {
    const { fontColorName, fontFamily } = theme.colNumber;

    return getBitmapFontName(fontFamily, fontColorName);
  }, [getBitmapFontName, theme]);

  const updateColNumbers = useCallback(() => {
    const newStartCol = viewportEdges.current.startCol;
    const newEndCol = viewportEdges.current.endCol;
    if (
      colNumbers[0]?.col === newStartCol &&
      colNumbers[colNumbers.length]?.col === newEndCol
    )
      return;

    const updatedColNumbers = [];
    for (let col = newStartCol; col < newEndCol; ++col) {
      updatedColNumbers.push({ row: 0, col });
    }

    setColNumbers(updatedColNumbers);
  }, [colNumbers, viewportEdges]);

  useEffect(() => {
    const unsubscribe =
      gridViewportSubscriber.current.subscribe(updateColNumbers);

    return () => unsubscribe();
  });

  return (
    <Container zIndex={ComponentLayer.ColNumbers} sortableChildren>
      {colNumbers.map(({ col }) => (
        <ColNumber col={col} fontName={fontName} key={col} />
      ))}
    </Container>
  );
}
