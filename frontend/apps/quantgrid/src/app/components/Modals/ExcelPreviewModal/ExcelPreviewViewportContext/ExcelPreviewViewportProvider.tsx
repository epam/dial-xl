import { PropsWithChildren, useMemo, useState } from 'react';

import { ExcelPreviewGridData } from './ExcelPreviewGridData';
import { ExcelPreviewViewportContext } from './ExcelPreviewViewportContext';

export function ExcelPreviewViewportContextProvider({
  children,
}: PropsWithChildren) {
  const [viewGridData] = useState(new ExcelPreviewGridData());

  const value = useMemo(
    () => ({
      viewGridData,
    }),
    [viewGridData],
  );

  return (
    <ExcelPreviewViewportContext.Provider value={value}>
      {children}
    </ExcelPreviewViewportContext.Provider>
  );
}
