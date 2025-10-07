import { BehaviorSubject } from 'rxjs';

import { renderHook } from '@testing-library/react';

import { GridStateContext } from '../../context';
import { Edges, GridTable } from '../../types';
import { useNavigation } from '../useNavigation';
import { useSelectionMoveNextAvailable } from '../useSelectionMoveNextAvailable';

jest.mock('../../utils', () => ({
  isCellEditorOpen: jest.fn(() => false),
}));

jest.mock('../useNavigation', () => ({
  useNavigation: jest.fn(),
}));

describe('useSelectionMoveNextAvailable', () => {
  const mockMoveViewportToCell = jest.fn();
  const mockSetSelectionEdges = jest.fn();
  const mockGetCell = jest.fn();

  const defaultGridSizes = {
    edges: {
      col: 100,
      row: 100,
      maxCol: 200,
      maxRow: 200,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMoveViewportToCell.mockReset();
    mockSetSelectionEdges.mockReset();
    mockGetCell.mockReset();

    mockGetCell.mockImplementation((col, row) => ({
      startCol: col,
      endCol: col,
      row,
    }));

    (useNavigation as jest.Mock).mockReturnValue({
      moveViewportToCell: mockMoveViewportToCell,
    });
  });

  const createWrapper = (
    selection: Edges,
    tableStructure: GridTable[] = [],
    gridSizes = defaultGridSizes
  ) => {
    const selection$ = new BehaviorSubject<Edges>(selection);
    const contextValue = {
      gridSizes,
      selection$,
      setSelectionEdges: mockSetSelectionEdges,
      gridApi: { current: {} },
      tableStructure,
      getCell: mockGetCell,
    };

    return ({ children }: { children: React.ReactNode }) => (
      <GridStateContext.Provider value={contextValue as any}>
        {children}
      </GridStateContext.Provider>
    );
  };

  describe('Table navigation', () => {
    const createTableStructure = (): GridTable[] => [
      // Table 1 (top-left)
      {
        startCol: 2,
        endCol: 4,
        startRow: 2,
        endRow: 4,
      } as GridTable,
      // Table 2 (top-right)
      {
        startCol: 8,
        endCol: 10,
        startRow: 2,
        endRow: 4,
      } as GridTable,
      // Table 3 (bottom-left)
      {
        startCol: 2,
        endCol: 4,
        startRow: 8,
        endRow: 10,
      } as GridTable,
      // Table 4 (bottom-right)
      {
        startCol: 8,
        endCol: 10,
        startRow: 8,
        endRow: 10,
      } as GridTable,
    ];

    describe('Navigation within a table', () => {
      it('should move to top edge when selection is inside table and direction is up', () => {
        const tableStructure = createTableStructure();
        const wrapper = createWrapper(
          { startCol: 3, startRow: 3, endCol: 3, endRow: 3 },
          tableStructure
        );

        const { result } = renderHook(() => useSelectionMoveNextAvailable(), {
          wrapper,
        });
        result.current.moveSelectionNextAvailable('up');

        expect(mockSetSelectionEdges).toHaveBeenCalledWith(
          expect.objectContaining({
            startRow: 2,
            endRow: 2,
          })
        );
      });

      it('should move to bottom edge when selection is inside table and direction is down', () => {
        const tableStructure = createTableStructure();
        const wrapper = createWrapper(
          { startCol: 3, startRow: 3, endCol: 3, endRow: 3 },
          tableStructure
        );

        const { result } = renderHook(() => useSelectionMoveNextAvailable(), {
          wrapper,
        });
        result.current.moveSelectionNextAvailable('down');

        expect(mockSetSelectionEdges).toHaveBeenCalledWith(
          expect.objectContaining({
            startRow: 4,
            endRow: 4,
          })
        );
      });

      it('should move to left edge when selection is inside table and direction is left', () => {
        const tableStructure = createTableStructure();
        const wrapper = createWrapper(
          { startCol: 3, startRow: 3, endCol: 3, endRow: 3 },
          tableStructure
        );

        const { result } = renderHook(() => useSelectionMoveNextAvailable(), {
          wrapper,
        });
        result.current.moveSelectionNextAvailable('left');

        expect(mockSetSelectionEdges).toHaveBeenCalledWith(
          expect.objectContaining({
            startCol: 2,
            endCol: 2,
          })
        );
      });

      it('should move to right edge when selection is inside table and direction is right', () => {
        const tableStructure = createTableStructure();
        const wrapper = createWrapper(
          { startCol: 3, startRow: 3, endCol: 3, endRow: 3 },
          tableStructure
        );

        const { result } = renderHook(() => useSelectionMoveNextAvailable(), {
          wrapper,
        });
        result.current.moveSelectionNextAvailable('right');

        expect(mockSetSelectionEdges).toHaveBeenCalledWith(
          expect.objectContaining({
            startCol: 4,
            endCol: 4,
          })
        );
      });
    });

    describe('Navigation between tables', () => {
      it('should move to the closest table above when direction is up', () => {
        const tableStructure = createTableStructure();
        // Starting from bottom-left table
        const wrapper = createWrapper(
          { startCol: 3, startRow: 8, endCol: 3, endRow: 8 },
          tableStructure
        );

        const { result } = renderHook(() => useSelectionMoveNextAvailable(), {
          wrapper,
        });
        result.current.moveSelectionNextAvailable('up');

        expect(mockSetSelectionEdges).toHaveBeenCalledWith(
          expect.objectContaining({
            startCol: 3,
            startRow: 4, // Should move to the bottom row of the top-left table
            endCol: 3,
            endRow: 4,
          })
        );
      });

      it('should move to the closest table below when direction is down', () => {
        const tableStructure = createTableStructure();
        // Starting from top-left table
        const wrapper = createWrapper(
          { startCol: 3, startRow: 4, endCol: 3, endRow: 4 },
          tableStructure
        );

        const { result } = renderHook(() => useSelectionMoveNextAvailable(), {
          wrapper,
        });
        result.current.moveSelectionNextAvailable('down');

        expect(mockSetSelectionEdges).toHaveBeenCalledWith(
          expect.objectContaining({
            startCol: 3,
            startRow: 8, // Should move to the top row of the bottom-left table
            endCol: 3,
            endRow: 8,
          })
        );
      });

      it('should move to the closest table to the left when direction is left', () => {
        const tableStructure = createTableStructure();
        // Starting from top-right table
        const wrapper = createWrapper(
          { startCol: 8, startRow: 3, endCol: 8, endRow: 3 },
          tableStructure
        );

        const { result } = renderHook(() => useSelectionMoveNextAvailable(), {
          wrapper,
        });
        result.current.moveSelectionNextAvailable('left');

        expect(mockSetSelectionEdges).toHaveBeenCalledWith(
          expect.objectContaining({
            startCol: 4, // Should move to the right column of the top-left table
            startRow: 3,
            endCol: 4,
            endRow: 3,
          })
        );
      });

      it('should move to the closest table to the right when direction is right', () => {
        const tableStructure = createTableStructure();
        // Starting from top-left table
        const wrapper = createWrapper(
          { startCol: 4, startRow: 3, endCol: 4, endRow: 3 },
          tableStructure
        );

        const { result } = renderHook(() => useSelectionMoveNextAvailable(), {
          wrapper,
        });
        result.current.moveSelectionNextAvailable('right');

        expect(mockSetSelectionEdges).toHaveBeenCalledWith(
          expect.objectContaining({
            startCol: 8, // Should move to the left column of the top-right table
            startRow: 3,
            endCol: 8,
            endRow: 3,
          })
        );
      });
    });

    describe('Navigation to spreadsheet edges', () => {
      it('should move to the top edge of the spreadsheet when no table is above', () => {
        // Only have tables in the bottom half
        const tableStructure = [
          {
            startCol: 2,
            endCol: 4,
            startRow: 8,
            endRow: 10,
          } as GridTable,
        ];

        // Start from a position with no table above
        const wrapper = createWrapper(
          { startCol: 3, startRow: 5, endCol: 3, endRow: 5 },
          tableStructure
        );

        const { result } = renderHook(() => useSelectionMoveNextAvailable(), {
          wrapper,
        });
        result.current.moveSelectionNextAvailable('up');

        expect(mockSetSelectionEdges).toHaveBeenCalledWith(
          expect.objectContaining({
            startCol: 3,
            startRow: 1, // Should move to the top edge of the spreadsheet
            endCol: 3,
            endRow: 1,
          })
        );
      });

      it('should move to the bottom edge of the spreadsheet when no table is below', () => {
        // Only have tables in the top half
        const tableStructure = [
          {
            startCol: 2,
            endCol: 4,
            startRow: 2,
            endRow: 4,
          } as GridTable,
        ];

        // Start from a position with no table below
        const wrapper = createWrapper(
          { startCol: 3, startRow: 5, endCol: 3, endRow: 5 },
          tableStructure
        );

        const { result } = renderHook(() => useSelectionMoveNextAvailable(), {
          wrapper,
        });
        result.current.moveSelectionNextAvailable('down');

        expect(mockSetSelectionEdges).toHaveBeenCalledWith(
          expect.objectContaining({
            startCol: 3,
            startRow: 100, // Should move to the bottom edge of the spreadsheet
            endCol: 3,
            endRow: 100,
          })
        );
      });

      it('should move to the left edge of the spreadsheet when no table is to the left', () => {
        // Only have tables in the right half
        const tableStructure = [
          {
            startCol: 8,
            endCol: 10,
            startRow: 2,
            endRow: 4,
          } as GridTable,
        ];

        // Start from a position with no table to the left
        const wrapper = createWrapper(
          { startCol: 5, startRow: 3, endCol: 5, endRow: 3 },
          tableStructure
        );

        const { result } = renderHook(() => useSelectionMoveNextAvailable(), {
          wrapper,
        });
        result.current.moveSelectionNextAvailable('left');

        expect(mockSetSelectionEdges).toHaveBeenCalledWith(
          expect.objectContaining({
            startCol: 1, // Should move to the left edge of the spreadsheet
            startRow: 3,
            endCol: 1,
            endRow: 3,
          })
        );
      });

      it('should move to the right edge of the spreadsheet when no table is to the right', () => {
        // Only have tables in the left half
        const tableStructure = [
          {
            startCol: 2,
            endCol: 4,
            startRow: 2,
            endRow: 4,
          } as GridTable,
        ];

        // Start from a position with no table to the right
        const wrapper = createWrapper(
          { startCol: 5, startRow: 3, endCol: 5, endRow: 3 },
          tableStructure
        );

        const { result } = renderHook(() => useSelectionMoveNextAvailable(), {
          wrapper,
        });
        result.current.moveSelectionNextAvailable('right');

        expect(mockSetSelectionEdges).toHaveBeenCalledWith(
          expect.objectContaining({
            startCol: 100, // Should move to the right edge of the spreadsheet
            startRow: 3,
            endCol: 100,
            endRow: 3,
          })
        );
      });

      it('should respect max boundaries when jumping to spreadsheet edges', () => {
        // Custom grid sizes with max values
        const customGridSizes = {
          edges: {
            col: 100, // Visible right edge
            row: 100, // Visible bottom edge
            maxCol: 150, // Maximum right edge
            maxRow: 150, // Maximum bottom edge
          },
        };

        const tableStructure: GridTable[] = [];

        // Starting position near bottom-right
        const wrapper = createWrapper(
          { startCol: 140, startRow: 140, endCol: 140, endRow: 140 },
          tableStructure,
          customGridSizes
        );

        const { result } = renderHook(() => useSelectionMoveNextAvailable(), {
          wrapper,
        });

        // Test right direction
        result.current.moveSelectionNextAvailable('right');
        expect(mockSetSelectionEdges).toHaveBeenCalledWith(
          expect.objectContaining({
            startCol: 100, // Should respect visible right edge (not max)
            startRow: 140,
          })
        );

        mockSetSelectionEdges.mockClear();

        // Test down direction
        result.current.moveSelectionNextAvailable('down');
        expect(mockSetSelectionEdges).toHaveBeenCalledWith(
          expect.objectContaining({
            startCol: 140,
            startRow: 100, // Should respect visible bottom edge (not max)
          })
        );
      });
    });
  });
});
