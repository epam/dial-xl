import { vi } from 'vitest';

import { FilterOperator, naExpression, naValue } from '@frontend/parser';
import { act, RenderHookResult } from '@testing-library/react';

import { useFilterEditDsl } from '../useFilterEditDsl';
import { createWrapper, initialProps } from './createWrapper';
import { hookTestSetup } from './hookTestSetup';
import { TestWrapperProps } from './types';

describe('useFilterEditDsl', () => {
  const props: TestWrapperProps = { ...initialProps };
  let hook: RenderHookResult<
    ReturnType<typeof useFilterEditDsl>,
    { dsl: string }
  >['result'];
  let setDsl: (dsl: string) => void;
  let Wrapper: React.FC<React.PropsWithChildren>;

  beforeAll(() => {
    Wrapper = createWrapper(props);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const hookRender = hookTestSetup(useFilterEditDsl, Wrapper);
    hook = hookRender.result;
    setDsl = hookRender.setDsl;
  });

  describe('applyConditionFilter for numeric type', () => {
    it('should add apply and numeric filter block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] > 1\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyConditionFilter('t1', 'f1', '>', '1', 'numeric'),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should change single numeric filter block', () => {
      // Arrange
      const dsl = 'table t1\n[f1]=1\n[f2]=2\napply\nfilter [f1] > 1';
      const expectedDsl =
        'table t1\n[f1]=1\n[f2]=2\napply\nfilter [f1] >= 2\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyConditionFilter('t1', 'f1', '>=', '2', 'numeric'),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add numeric filter to existing one', () => {
      // Arrange
      const dsl = 'table t1\n[f1]=1\n[f2]=2\napply\nfilter [f1] > 1';
      const expectedDsl =
        'table t1\n[f1]=1\n[f2]=2\napply\nfilter [f1] > 1 AND [f2] > 1\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyConditionFilter('t1', 'f2', '>', '1', 'numeric'),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should clear numeric filter', () => {
      // Arrange
      const dsl =
        'table t1\n[f1]=1\n[f2]=2\napply\nfilter [f1] > 1 AND [f2] > 1';
      const expectedDsl =
        'table t1\n[f1]=1\n[f2]=2\napply\nfilter [f1] > 1\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyConditionFilter('t1', 'f2', '', null, 'numeric'),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add numeric filter to existing text filter', () => {
      // Arrange
      const dsl =
        'table t1\n[f1]=TEXT(1)\n[f2]=2\napply\nfilter [f1] = "text1"';
      const expectedDsl =
        'table t1\n[f1]=TEXT(1)\n[f2]=2\napply\nfilter [f1] = "text1" AND [f2] > 1\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyConditionFilter('t1', 'f2', '>', '1', 'numeric'),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add between number filter', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter BETWEEN([f1],1,3)\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.Between,
          ['1', '3'],
          'numeric',
        ),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('applyConditionFilter for text type', () => {
    it('should add contains text filter', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter CONTAINS([f1],"1")\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.Contains,
          '1',
          'text',
        ),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add not contains text filter', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter NOT CONTAINS([f1],"1")\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.NotContains,
          '1',
          'text',
        ),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add begins with text filter', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter LEFT([f1],1) = "1"\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.BeginsWith,
          '1',
          'text',
        ),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add between text filter', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter BETWEEN([f1],"1","3")\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.Between,
          ['1', '3'],
          'text',
        ),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add filter to existing uni op filter', () => {
      // Arrange
      const dsl =
        'table t1\n[f1]=1\n[f2]=2\napply\nfilter NOT CONTAINS([f1], "1")';
      const expectedDsl =
        'table t1\n[f1]=1\n[f2]=2\napply\nfilter NOT CONTAINS([f1],"1") AND [f2] = 2\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f2',
          FilterOperator.Equals,
          '2',
          'text',
        ),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('applyConditionFilter NA handling', () => {
    it('should add filter for Equals NA (naValue) using IF(ISNA...)', () => {
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter IF(ISNA([f1]), TRUE, FALSE)\r\n';
      setDsl(dsl);

      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.Equals,
          naValue,
          'text',
        ),
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add filter for Equals NA (naExpression) using IF(ISNA...)', () => {
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter IF(ISNA([f1]), TRUE, FALSE)\r\n';
      setDsl(dsl);

      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.Equals,
          naExpression,
          'text',
        ),
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add filter for NotEquals NA using IF(ISNA...)', () => {
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter IF(ISNA([f1]), FALSE, TRUE)\r\n';
      setDsl(dsl);

      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.NotEquals,
          naValue,
          'text',
        ),
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add filter for NotEquals non-NA without IF(ISNA...) wrapper', () => {
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] <> 3\r\n';
      setDsl(dsl);

      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.NotEquals,
          '3',
          'text',
        ),
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add filter for Equals non-NA without IF(ISNA...) wrapper', () => {
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] = 5\r\n';
      setDsl(dsl);

      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.Equals,
          '5',
          'text',
        ),
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add numeric filter for Equals NA using IF(ISNA...)', () => {
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter IF(ISNA([f1]), TRUE, FALSE)\r\n';
      setDsl(dsl);

      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.Equals,
          naValue,
          'numeric',
        ),
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add numeric filter for NotEquals non-NA without IF(ISNA...) wrapper', () => {
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] <> 5\r\n';
      setDsl(dsl);

      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.NotEquals,
          '5',
          'numeric',
        ),
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should not apply IF(ISNA...) for Between (skip NA handling)', () => {
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter BETWEEN([f1],1,3)\r\n';
      setDsl(dsl);

      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.Between,
          ['1', '3'],
          'numeric',
        ),
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('applyTextFilter', () => {
    it('should add apply text filter block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] = "text"\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyListFilter('t1', 'f1', ['text'], 'selected', false),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should change text filter block', () => {
      // Arrange
      const dsl =
        'table t1\n[f1]=TEXT(1)\n[f2]=2\napply\nfilter [f1] = "text1"';
      const expectedDsl =
        'table t1\n[f1]=TEXT(1)\n[f2]=2\napply\nfilter [f1] = "text1" OR [f1] = "text2"\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyListFilter(
          't1',
          'f1',
          ['text1', 'text2'],
          'selected',
          false,
        ),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should apply new text filter', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] = "some_filter"\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyListFilter(
          't1',
          'f1',
          ['some_filter'],
          'selected',
          false,
        ),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should apply text filter and escape value', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl = `table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] = "fil''ter"\r\n`;
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.applyListFilter(
          't1',
          'f1',
          [`fil'ter`],
          'selected',
          false,
        ),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('applyListFilter - selected vs unselected', () => {
    describe('selected (show only chosen values)', () => {
      it('should add filter with OR for multiple selected text values', () => {
        const dsl = 'table t1 [f1]=1 [f2]=2';
        const expectedDsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] = "a" OR [f1] = "b"\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter(
            't1',
            'f1',
            ['a', 'b'],
            'selected',
            false,
          ),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should add filter with OR for multiple selected numeric values', () => {
        const dsl = 'table t1 [f1]=1 [f2]=2';
        const expectedDsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] = 1 OR [f1] = 2\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter(
            't1',
            'f1',
            ['1', '2'],
            'selected',
            true,
          ),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should add filter when only NA is selected (no other values exist)', () => {
        const dsl = 'table t1 [f1]=1 [f2]=2';
        const expectedDsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter IF(ISNA([f1]), TRUE, FALSE)\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter(
            't1',
            'f1',
            [naValue],
            'selected',
            false,
          ),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should add filter when NA and other values are selected (NA and values OR-ed)', () => {
        const dsl = 'table t1 [f1]=1 [f2]=2';
        const expectedDsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter IF(ISNA([f1]), TRUE, [f1] = "a" OR [f1] = "b")\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter(
            't1',
            'f1',
            [naValue, 'a', 'b'],
            'selected',
            false,
          ),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });
    });

    describe('unselected (exclude chosen values)', () => {
      it('should add filter when only NA is unselected (no other values exist)', () => {
        const dsl = 'table t1 [f1]=1 [f2]=2';
        const expectedDsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter IF(ISNA([f1]), FALSE, TRUE)\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter(
            't1',
            'f1',
            [naValue],
            'unselected',
            false,
          ),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should add filter with AND for single unselected text value', () => {
        const dsl = 'table t1 [f1]=1 [f2]=2';
        const expectedDsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter IF(ISNA([f1]), TRUE, [f1] <> "x")\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter('t1', 'f1', ['x'], 'unselected', false),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should add filter with AND for multiple unselected text values', () => {
        const dsl = 'table t1 [f1]=1 [f2]=2';
        const expectedDsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter IF(ISNA([f1]), TRUE, [f1] <> "a" AND [f1] <> "b")\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter(
            't1',
            'f1',
            ['a', 'b'],
            'unselected',
            false,
          ),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should add filter with AND for multiple unselected numeric values', () => {
        const dsl = 'table t1 [f1]=1 [f2]=2';
        const expectedDsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter IF(ISNA([f1]), TRUE, [f1] <> 1 AND [f1] <> 2)\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter(
            't1',
            'f1',
            ['1', '2'],
            'unselected',
            true,
          ),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should clear filter when unselected gets empty values', () => {
        const dsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] <> "a" AND [f1] <> "b"';
        const expectedDsl = 'table t1 [f1]=1 [f2]=2\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter('t1', 'f1', [], 'unselected', false),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should replace existing unselected filter with new unselected values', () => {
        const dsl =
          'table t1 [f1]=1 [f2]=2\napply\nfilter [f1] <> "old1" AND [f1] <> "old2"';
        const expectedDsl =
          'table t1 [f1]=1 [f2]=2\napply\nfilter IF(ISNA([f1]), TRUE, [f1] <> "new1" AND [f1] <> "new2")\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter(
            't1',
            'f1',
            ['new1', 'new2'],
            'unselected',
            false,
          ),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should combine unselected field filter with existing other field filter', () => {
        const dsl = 'table t1\n[f1]=1\n[f2]=2\napply\nfilter [f2] = "keep"';
        const expectedDsl =
          'table t1\n[f1]=1\n[f2]=2\napply\nfilter [f2] = "keep" AND IF(ISNA([f1]), TRUE, [f1] <> "exclude")\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter(
            't1',
            'f1',
            ['exclude'],
            'unselected',
            false,
          ),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });
    });

    describe('empty selected (clear this field)', () => {
      it('should produce [field] <> [field] when clearing existing list filter', () => {
        const dsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] = "a" OR [f1] = "b"';
        const expectedDsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] <> [f1]\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter('t1', 'f1', [], 'selected', false),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should add apply with [field] <> [field] when no filter exists yet', () => {
        const dsl = 'table t1 [f1]=1 [f2]=2';
        const expectedDsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] <> [f1]\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter('t1', 'f1', [], 'selected', false),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should clear only this field when other field has filter', () => {
        const dsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] = "a" AND [f2] = "x"';
        const expectedDsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f2] = "x" AND [f1] <> [f1]\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter('t1', 'f1', [], 'selected', false),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });
    });

    describe('empty unselected (clear this field)', () => {
      it('should remove apply block when clearing only unselected filter', () => {
        const dsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] <> "a" AND [f1] <> "b"';
        const expectedDsl = 'table t1 [f1]=1 [f2]=2\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter('t1', 'f1', [], 'unselected', false),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should be no-op when no filter exists (empty unselected)', () => {
        const dsl = 'table t1 [f1]=1 [f2]=2';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter('t1', 'f1', [], 'unselected', false),
        );

        expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
      });

      it('should clear only this field when other field has filter', () => {
        const dsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] <> "a" AND [f2] = "keep"';
        const expectedDsl =
          'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f2] = "keep"\r\n';
        setDsl(dsl);

        act(() =>
          hook.current.applyListFilter('t1', 'f1', [], 'unselected', false),
        );

        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });
    });
  });
});
