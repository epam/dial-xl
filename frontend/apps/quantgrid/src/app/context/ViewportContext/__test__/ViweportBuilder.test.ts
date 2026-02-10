import { vi } from 'vitest';

import { dynamicFieldName, SheetReader } from '@frontend/parser';

import { getTableFieldsForViewport } from '../getTableFieldsForViewport';
import { ViewportBuilder } from '../ViewportBuilder';

vi.mock('../getTableFieldsForViewport', () => ({
  getTableFieldsForViewport: vi.fn(),
}));

vi.mock('../../../store/UserSettingsStore', () => ({
  useUserSettingsStore: Object.assign(() => ({}), {
    getState: () => ({ data: {} }),
    setState: () => {},
    subscribe: () => () => {},
  }),
}));

function makeViewGridData(tableData: any) {
  return {
    getTablesData: () => [tableData],
  } as any;
}

function makeTableData({
  dsl,
  dynamicFields,
  isDynamicFieldsRequested = false,
  totalRows = 0,
  isTotalRowsUpdated = false,
}: {
  dsl: string;
  dynamicFields?: Array<string | undefined>;
  isDynamicFieldsRequested?: boolean;
  totalRows?: number;
  isTotalRowsUpdated?: boolean;
}) {
  const table = SheetReader.parseSheet(dsl).tables[0];

  const tableData: any = {
    table,
    dynamicFields,
    isDynamicFieldsRequested,
    totalRows,
    isTotalRowsUpdated,
    chunks: {},
    fallbackChunks: {},
    total: table.total,
    highlightData: undefined,
    fieldErrors: {},
    indexErrors: {},
    columnHashes: {},
    previousColumnHashes: {},
    nestedColumnNames: new Set<string>(),
    columnReferenceTableNames: {},
    types: {},
    formats: {},
  };

  return tableData;
}

describe('ViewportBuilder.buildViewportRequest', () => {
  beforeEach(() => {
    (getTableFieldsForViewport as jest.Mock).mockReset();
  });

  it('should cache requested ranges and return empty result for the same viewport called twice', () => {
    // Arrange
    const tableData = makeTableData({
      dsl: '!layout(1,1) table t\n [f1]=1\n [f2]=2',
    });

    (getTableFieldsForViewport as jest.Mock).mockReturnValue({
      fields: ['f1', 'f2'],
    });

    const builder = new ViewportBuilder(makeViewGridData(tableData));
    const viewport = { startCol: 0, endCol: 20, startRow: 0, endRow: 20 };

    // Act
    const first = builder.buildViewportRequest(viewport);
    const second = builder.buildViewportRequest(viewport);

    // Assert
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual([]);
  });

  it('should clamp requested rows by totalRows when isTotalRowsUpdated=true', () => {
    // Arrange
    const tableData = makeTableData({
      dsl: '!layout(1,1) table t\n [f1]=1',
      totalRows: 500,
      isTotalRowsUpdated: true,
    });

    (getTableFieldsForViewport as jest.Mock).mockReturnValue({
      fields: ['f1'],
    });

    const builder = new ViewportBuilder(makeViewGridData(tableData));
    const viewport = { startCol: 0, endCol: 20, startRow: 0, endRow: 20 };

    // Act
    const res = builder.buildViewportRequest(viewport);

    // Assert
    expect(res.every((vp: any) => vp.end_row <= 500)).toBe(true);
    expect(res.some((vp: any) => vp.end_row === 500)).toBe(true);
  });

  it('should force request only new fields when rows are cached (forcedByFields)', () => {
    // Arrange
    const tableData = makeTableData({
      dsl: '!layout(1,1) table t\n [f1]=1\n [f2]=2',
    });

    const builder = new ViewportBuilder(makeViewGridData(tableData));
    const viewport = { startCol: 0, endCol: 20, startRow: 0, endRow: 20 };

    (getTableFieldsForViewport as jest.Mock).mockReturnValueOnce({
      fields: ['f1'],
    });

    (getTableFieldsForViewport as jest.Mock).mockReturnValueOnce({
      fields: ['f1', 'f2'],
    });

    // Act
    const first = builder.buildViewportRequest(viewport);
    const second = builder.buildViewportRequest(viewport);

    // Assert
    expect(first.some((vp: any) => vp.fieldKey?.field === 'f1')).toBe(true);

    expect(second.some((vp: any) => vp.fieldKey?.field === 'f2')).toBe(true);
    expect(second.some((vp: any) => vp.fieldKey?.field === 'f1')).toBe(false);
  });

  it("should do dynamic bootstrap for '*' when table is offscreen and dynamic fields were not requested yet", () => {
    // Arrange
    const tableData = makeTableData({
      dsl: '!layout(2000,1) table t\n [a]=1\n [*]=some_formula\n [b]=2',
      dynamicFields: [],
      isDynamicFieldsRequested: false,
      totalRows: 100,
      isTotalRowsUpdated: true,
    });

    (getTableFieldsForViewport as jest.Mock).mockReturnValue({
      fields: [dynamicFieldName],
      dynamicRange: { start: 0, end: 10 },
    });

    const builder = new ViewportBuilder(makeViewGridData(tableData));
    const viewport = { startCol: 0, endCol: 20, startRow: 0, endRow: 20 };

    // Act
    const res = builder.buildViewportRequest(viewport);

    // Assert
    expect(res.length).toBe(1);
    expect((res[0] as any).fieldKey).toEqual({
      table: 't',
      field: dynamicFieldName,
    });
    expect((res[0] as any).start_row).toBe(0);
    expect((res[0] as any).end_row).toBe(1);
    expect((res[0] as any).start_column).toBe(0);
    expect((res[0] as any).end_column).toBe(10);
  });

  it("should request only new dynamic column ranges for '*' when rows are cached", () => {
    // Arrange
    const tableData = makeTableData({
      dsl: '!layout(1,1) table t\n [a]=1\n [*]=some_formula\n [b]=2',
      dynamicFields: ['d1', 'd2', 'd3', 'd4'],
      isDynamicFieldsRequested: true,
    });

    const builder = new ViewportBuilder(makeViewGridData(tableData));
    const viewport = { startCol: 0, endCol: 20, startRow: 0, endRow: 20 };

    (getTableFieldsForViewport as jest.Mock).mockReturnValueOnce({
      fields: [dynamicFieldName],
      dynamicRange: { start: 0, end: 2 },
    });

    (getTableFieldsForViewport as jest.Mock).mockReturnValueOnce({
      fields: [dynamicFieldName],
      dynamicRange: { start: 2, end: 4 },
    });

    // Act
    const first = builder.buildViewportRequest(viewport);
    const second = builder.buildViewportRequest(viewport);

    // Assert
    expect(first.length).toBeGreaterThan(0);

    expect(second).toHaveLength(1);
    expect((second[0] as any).fieldKey).toEqual({
      table: 't',
      field: dynamicFieldName,
    });
    expect((second[0] as any).start_column).toBe(2);
    expect((second[0] as any).end_column).toBe(4);
  });
});
