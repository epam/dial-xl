import {
  CommonMetadata,
  csvFileExtension,
  xlsFileExtension,
  xlsxFileExtension,
} from '@frontend/common';

export type InputType =
  | 'csv'
  | 'excel-file'
  | 'excel-sheet'
  | 'excel-table'
  | 'import-catalog';

export interface BuildInputFormulaParams {
  type: InputType;
  file?: CommonMetadata;
  excelEntityName?: string;
  sourceKey?: string;
  datasetKey?: string;
}

export interface InputFormulaResult {
  formula: string;
  tableName: string;
}

/**
 * Builds an INPUT formula based on the input type and parameters
 */
export function buildInputFormula(
  params: BuildInputFormulaParams,
): InputFormulaResult | null {
  const { type, file, excelEntityName } = params;

  switch (type) {
    case 'csv':
      if (!file) return null;

      return {
        formula: `:INPUT("${file.url}")`,
        tableName: file.name.replaceAll(csvFileExtension, ''),
      };

    case 'excel-sheet':
      if (!file || !excelEntityName) return null;

      return {
        formula: `:INPUT("${file.url}?sheet=${excelEntityName}")`,
        tableName: file.name
          .replaceAll(xlsxFileExtension, '')
          .replaceAll(xlsFileExtension, ''),
      };

    case 'excel-table':
      if (!file || !excelEntityName) return null;

      return {
        formula: `:INPUT("${file.url}?table=${excelEntityName}")`,
        tableName: file.name
          .replaceAll(xlsxFileExtension, '')
          .replaceAll(xlsFileExtension, ''),
      };

    case 'import-catalog':
      // For import catalog, we don't create a formula here
      // Instead, we open a modal (handled by caller)
      return null;

    default:
      return null;
  }
}

/**
 * Creates a table from input with the given parameters
 */
export interface CreateTableFromInputParams {
  type: InputType;
  file?: CommonMetadata;
  excelEntityName?: string;
  sourceKey?: string;
  datasetKey?: string;
  sourceName?: string;
  col?: number;
  row?: number;
  createInNewSheet?: boolean;
  onCreateFormula: (params: {
    col: number;
    row: number;
    value: string;
    newTableName: string;
    createInNewSheet: boolean;
  }) => void;
  onOpenImportModal: (
    sourceKey: string,
    datasetKey: string,
    sourceName: string,
    col?: number,
    row?: number,
  ) => void;
  onOpenExcelModal: (
    file: CommonMetadata,
    createInNewSheet: boolean,
    col?: number,
    row?: number,
  ) => void;
}

/**
 * Unified function to create a table from any input type
 */
export function createTableFromInput(params: CreateTableFromInputParams): void {
  const {
    type,
    file,
    excelEntityName,
    sourceKey,
    datasetKey,
    sourceName,
    col = 0,
    row = 0,
    createInNewSheet = false,
    onCreateFormula,
    onOpenImportModal,
    onOpenExcelModal,
  } = params;

  // Handle import catalog separately
  if (type === 'import-catalog') {
    if (sourceKey && datasetKey && sourceName) {
      onOpenImportModal(sourceKey, datasetKey, sourceName, col, row);
    }

    return;
  }

  if (type === 'excel-file') {
    if (file) {
      onOpenExcelModal(file, createInNewSheet, col, row);
    }

    return;
  }

  // Build formula for file-based inputs
  const result = buildInputFormula({ type, file, excelEntityName });

  if (result) {
    onCreateFormula({
      col,
      row,
      value: result.formula,
      newTableName: result.tableName,
      createInNewSheet,
    });
  }
}
