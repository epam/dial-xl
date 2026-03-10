import { createContext } from 'react';

import { ExcelPreviewGridData } from './ExcelPreviewGridData';

type ExcelPreviewViewportContextValues = {
  viewGridData: ExcelPreviewGridData;
};

export const ExcelPreviewViewportContext =
  createContext<ExcelPreviewViewportContextValues>(
    {} as ExcelPreviewViewportContextValues,
  );
