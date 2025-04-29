import { FilterOperator } from '@frontend/parser';
import { act, RenderHookResult } from '@testing-library/react';

import { useFilterEditDsl } from '../useFilterEditDsl';
import { hookTestSetup } from './hookTestSetup';
import { RenderProps, TestWrapperProps } from './types';

const initialProps: TestWrapperProps = {
  appendToFn: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(() => Promise.resolve(true)),
  projectName: 'project1',
  sheetName: 'sheet1',
};

describe('useFilterEditDsl', () => {
  let props: TestWrapperProps;
  let hook: RenderHookResult<
    ReturnType<typeof useFilterEditDsl>,
    { dsl: string }
  >['result'];
  let rerender: (props?: RenderProps) => void;

  beforeEach(() => {
    props = { ...initialProps };
    jest.clearAllMocks();

    const hookRender = hookTestSetup(useFilterEditDsl, props);

    hook = hookRender.result;
    rerender = hookRender.rerender;
  });

  describe('applyConditionFilter for numeric type', () => {
    it('should add apply and numeric filter block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\nfilter [f1] > 1\r\n';
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.applyConditionFilter('t1', 'f1', '>', '1', 'numeric')
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should change single numeric filter block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\napply\nfilter [f1] > 1';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2\napply\nfilter [f1] >= 2\r\n';
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.applyConditionFilter('t1', 'f1', '>=', '2', 'numeric')
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add numeric filter to existing one', () => {
      // Arrange
      const dsl = 'table t1\n[f1]=1\n[f2]=2\napply\nfilter [f1] >= 2';
      const expectedDsl =
        'table t1\n[f1]=1\n[f2]=2\napply\nfilter [f1] >= 2 AND [f2] > 1\r\n';
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.applyConditionFilter('t1', 'f2', '>', '1', 'numeric')
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
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.applyConditionFilter('t1', 'f2', '', null, 'numeric')
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add numeric filter to existing text filter', () => {
      // Arrange
      const dsl = 'table t1\n[f1]=TEXT(1)\n[f2]=2\napply\nfilter [f1] = "1"';
      const expectedDsl =
        'table t1\n[f1]=TEXT(1)\n[f2]=2\napply\nfilter [f1] = "1" AND [f2] > 1\r\n';
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.applyConditionFilter('t1', 'f2', '>', '1', 'numeric')
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
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.Between,
          ['1', '3'],
          'numeric'
        )
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
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.Contains,
          '1',
          'text'
        )
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
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.NotContains,
          '1',
          'text'
        )
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
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.BeginsWith,
          '1',
          'text'
        )
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
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f1',
          FilterOperator.Between,
          ['1', '3'],
          'text'
        )
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
        'table t1\n[f1]=1\n[f2]=2\napply\nfilter NOT CONTAINS([f1],"1") AND [f2] = "2"\r\n';
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.applyConditionFilter(
          't1',
          'f2',
          FilterOperator.Equals,
          '2',
          'text'
        )
      );

      // Assert
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
      rerender({ dsl });

      // Act
      act(() => hook.current.applyListFilter('t1', 'f1', ['text'], false));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should change text filter block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\napply\nfilter [f1] = "text1"';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\napply\nfilter [f1] = "text1" OR [f1] = "text2"\r\n';
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.applyListFilter('t1', 'f1', ['text1', 'text2'], false)
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
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.applyListFilter('t1', 'f1', ['some_filter'], false)
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
      rerender({ dsl });

      // Act
      act(() => hook.current.applyListFilter('t1', 'f1', [`fil'ter`], false));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should clear text filter', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1 [f2]=2\napply\nfilter [f1] = "1" OR [f1] = "2"';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.applyListFilter('t1', 'f1', [], false));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });
});
