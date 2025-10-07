import fetchMock from 'jest-fetch-mock';
import { BehaviorSubject } from 'rxjs';

import { ColumnDataType, FormatKeys } from '@frontend/common';
import {
  chartSelectorDecoratorName,
  chartXAxisDecoratorName,
} from '@frontend/parser';
import { act, RenderHookResult } from '@testing-library/react';

import { useFieldEditDsl } from '../useFieldEditDsl';
import { createWrapper, initialProps } from './createWrapper';
import { hookTestSetup } from './hookTestSetup';
import { TestWrapperProps } from './types';

describe('useFieldEditDsl', () => {
  let props: TestWrapperProps = { ...initialProps };
  let result: RenderHookResult<
    ReturnType<typeof useFieldEditDsl>,
    { dsl: string }
  >['result'];
  let setDsl: (dsl: string) => void;
  let Wrapper: React.FC<React.PropsWithChildren>;
  let dsl: string;

  beforeAll(() => {
    Wrapper = createWrapper(props);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const hookRender = hookTestSetup(useFieldEditDsl, Wrapper);
    result = hookRender.result;
    setDsl = hookRender.setDsl;
  });

  describe('changeFieldDimension', () => {
    it('should remove dimension from field', () => {
      // Arrange

      dsl = 'table t1 dim [f1]=1\n[f2]=2';
      const expectedDsl = 'table t1 [f1]=1\n[f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldDimension('t1', 'f1', true));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Remove dimension t1[f1]`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove dimension from key field', () => {
      // Arrange
      dsl = 'table t1 key dim [f1]=1\n[f2]=2';
      const expectedDsl = 'table t1 key [f1]=1\n[f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldDimension('t1', 'f1', true));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Remove dimension t1[f1]`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should do nothing if removing dimension from a non-dimension field', () => {
      // Arrange
      dsl = 'table t1 key dim [f1]=1\n[f2]=2';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldDimension('t1', 'f2', true));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should add dimension to a field', () => {
      // Arrange
      dsl = 'table t1 key dim [f1]=1\n[f2]=2';
      const expectedDsl = 'table t1 key dim [f1]=1\ndim [f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldDimension('t1', 'f2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Add dimension t1[f2]`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add dimension to key field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\nkey [f2]=2';
      const expectedDsl = 'table t1 [f1]=1\nkey dim [f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldDimension('t1', 'f2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Add dimension t1[f2]`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should do nothing if add dimension to dimension field', () => {
      // Arrange
      const dsl = 'table t1 key dim [f1]=1\n[f2]=2';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldDimension('t1', 'f1'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should add dimension to a field in multi field group', () => {
      // Arrange
      dsl = 'table t1\n  [a],[b],[c] = INPUT("url")';
      const expectedDsl = 'table t1\n  dim [a],[b],[c] = INPUT("url")\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldDimension('t1', 'a'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Add dimension t1[a]`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove dimension from a field in multi field group', () => {
      // Arrange
      dsl = 'table t1\n  dim [a],[b],[c] = INPUT("url")';
      const expectedDsl = 'table t1\n  [a],[b],[c] = INPUT("url")\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldDimension('t1', 'a', true));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Remove dimension t1[a]`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('changeFieldKey', () => {
    it('should add key to field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\nkey [f2]=2';
      const expectedDsl = 'table t1 key [f1]=1\nkey [f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldKey('t1', 'f1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Add key t1[f1]`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should do nothing if add key to key field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\nkey [f2]=2';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldKey('t1', 'f2'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should add key after field size decorator', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 !size(3) [f2]=2';
      const expectedDsl = 'table t1 [f1]=1 !size(3) key [f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldKey('t1', 'f2'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add key between size decorator and dim keyword', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 !size(3) dim [f2]=2';
      const expectedDsl = 'table t1 [f1]=1 !size(3) dim key [f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldKey('t1', 'f2'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove key', () => {
      // Arrange
      const dsl = 'table t1\n[f1]=1\nkey [f2]=2';
      const expectedDsl = 'table t1\n[f1]=1\n[f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldKey('t1', 'f2', true));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Remove key t1[f2]`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should do nothing if remove key from not key field', () => {
      // Arrange
      const dsl = 'table t1\n[f1]=1\nkey [f2]=2';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldKey('t1', 'f1', true));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });
  });

  describe('changeFieldIndex', () => {
    it('should add index decorator to the field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2';
      const expectedDsl = 'table t1 [f1]=1\n!index()\n  [f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldIndex('t1', 'f2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Mark as Index t1[f2]`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove index decorator from the field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n!index()\n[f2]=2';
      const expectedDsl = 'table t1 [f1]=1\n[f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldIndex('t1', 'f2', true));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Unmark as Index t1[f2]`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('changeFieldDescription', () => {
    it('should add only description decorator to the field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n!index()\n[f2]=2';
      const expectedDsl =
        'table t1 [f1]=1\n!index()\n!description("field1")\n  [f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldDescription('t1', 'f2', 'field1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Mark as Description t1[f2]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add description and index decorators to the field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2';
      const expectedDsl =
        'table t1 [f1]=1\n!index()\n  !description("field1")\n  [f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldDescription('t1', 'f2', 'field1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Mark as Description t1[f2]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove description decorator from the field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n!index()\n!description("field1")\n[f2]=2';
      const expectedDsl = 'table t1 [f1]=1\n!index()\n[f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.changeFieldDescription('t1', 'f2', '', true));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Unmark as Description t1[f2]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('increaseColumnWidth', () => {
    it('should add field size decorator if not exists', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n!size(2)\n  [b]=2\n[c]=3\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.onIncreaseFieldColumnSize('t1', 'b'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Increase column width t1[b]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
    it('should add field size decorator if not exists but have note', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n##note\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n##note\n!size(2)\n  [b]=2\n[c]=3\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.onIncreaseFieldColumnSize('t1', 'b'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Increase column width t1[b]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
    it('should add field size decorator if not exists but have note and dim', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n##note\ndim [b]=RANGE(7)\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n##note\n!size(2)\n  dim [b]=RANGE(7)\n[c]=3\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.onIncreaseFieldColumnSize('t1', 'b'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Increase column width t1[b]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
    it('should update field size decorator correct', async () => {
      // Arrange
      const dsl = 'table t1 !size(5) [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 !size(6) [a]=1\n[b]=2\n[c]=3\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.onIncreaseFieldColumnSize('t1', 'a'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Increase column width t1[a]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('decreaseColumnWidth', () => {
    it('should do nothing if field sizes decorator not exists', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.onDecreaseFieldColumnSize('t1', 'b'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalledWith(
        `Decrease column width t1[b]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should update field sizes decorator correct', async () => {
      // Arrange
      const dsl = 'table t1 !size(5) [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 !size(4) [a]=1\n[b]=2\n[c]=3\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.onDecreaseFieldColumnSize('t1', 'a'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Decrease column width t1[a]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('onChangeFieldColumnSize', () => {
    it('should remove decorator if decrease width to 1 column', async () => {
      // Arrange
      const dsl = 'table t1 !size(5) [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.onChangeFieldColumnSize('t1', 'a', -4));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Decrease column width t1[a]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('setFormat', () => {
    it('should set format if no format set', async () => {
      // Arrange
      const dsl = '!layout(1, 1)\ntable t1\n[f1]=1';
      const expectedDsl =
        '!layout(1, 1)\ntable t1\n!format("integer", 1)\n  [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        result.current.setFormat('t1', 'f1', FormatKeys.Integer, [true])
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Set format "integer" to column "f1" of table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove format if general format passed', async () => {
      // Arrange
      const dsl = '!layout(1, 1)\ntable t1\n!format("any", 1) [f1]=1';
      const expectedDsl =
        '!layout(1, 1)\ntable t1\n!format("general") [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.setFormat('t1', 'f1', FormatKeys.General));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Set format "general" to column "f1" of table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should replace existing format with new one', async () => {
      // Arrange
      const dsl = '!layout(1, 1)\ntable t1\n!format("integer", 1) [f1]=1';
      const expectedDsl =
        '!layout(1, 1)\ntable t1\n!format("number", 22, 1) [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        result.current.setFormat('t1', 'f1', FormatKeys.Number, [22, true])
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Set format "number" to column "f1" of table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('editExpressionWithOverrideRemove', () => {
    it('should edit expression and remove override from this cell', () => {
      // Arrange
      const dsl =
        'table t1\nkey dim [source] = RANGE(10)\n[f1]=1\noverride\n[source],[f1]\n"1",123';
      const expectedDsl =
        'table t1\nkey dim [source] = RANGE(10)\n[f1]=1234\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        result.current.editExpressionWithOverrideRemove('t1', 'f1', '1234', 0)
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update expression of field [f1] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should delete table if delete last override in the manual table', () => {
      // Arrange
      const dsl = '!manual()\ntable t1\n[f1]=1\noverride\n[f1]\n123';
      const expectedDsl = '\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        result.current.editExpressionWithOverrideRemove('t1', 'f1', '1234', 0)
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Delete table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('editExpression', () => {
    beforeEach(() => {
      fetchMock.resetMocks();
    });

    const mockedResponse = JSON.stringify({
      dimensionalSchemaResponse: { fieldInfo: { isNested: false } },
    });
    const mockedResponseNested = JSON.stringify({
      dimensionalSchemaResponse: { fieldInfo: { isNested: true } },
    });

    it('should edit expression', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t1 [f1]=2 + 2\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(mockedResponse);

      // Act
      await act(() => result.current.editExpression('t1', 'f1', '2 + 2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update expression of column [f1] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should edit expression which starts with equals', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t1 [f1]=2 + 2\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(mockedResponse);

      // Act
      await act(() => result.current.editExpression('t1', 'f1', '= 2 + 2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update expression of column [f1] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should wrap expression in ERR function if tries to add table or field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = `table t1 [f1]=ERR("2 table t2 [f]=2")\r\n`;
      setDsl(dsl);
      fetchMock.mockResponseOnce(mockedResponse);

      // Act
      await act(() =>
        result.current.editExpression('t1', 'f1', '2 table t2 [f]=2')
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update expression of column [f1] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should edit field empty value expression', async () => {
      // Arrange
      const dsl = 'table t1 [f1]';
      const expectedDsl = 'table t1 [f1] = 2 + 2\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(mockedResponse);

      // Act
      await act(() => result.current.editExpression('t1', 'f1', '2 + 2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update expression of column [f1] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should insert dim keyword if expression resulted in nested field', async () => {
      // Arrange
      const dsl = 'table t1 [f1] = 1 + 1';
      const expectedDsl = 'table t1 dim [f1] = RANGE(10)\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(mockedResponseNested);

      // Act
      await act(() => result.current.editExpression('t1', 'f1', 'RANGE(10)'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update expression of column [f1] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should add fields to the left side', async () => {
      // Arrange
      const dsl = 'table t1 [x] = "test"';
      const expectedDsl = 'table t1 [x], [b] = T1(1)[[a],[b]]\r\n';
      setDsl(dsl);
      const mockedResponse = JSON.stringify({
        dimensionalSchemaResponse: {
          schema: ['a', 'b'],
          fieldInfo: { isNested: false, type: ColumnDataType.TABLE_VALUE },
        },
      });
      fetchMock.mockResponseOnce(mockedResponse);

      // Act
      await act(() =>
        result.current.editExpression('t1', 'x', 'T1(1)[[a],[b]]')
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update expression of column [x] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should remove fields on the left side', async () => {
      // Arrange
      const dsl = 'table t1 [x], [b] = T1(1)[[a],[b]]\n[Column1] = 1';
      const expectedDsl = 'table t1 [x] = T1(1)\n[Column1] = 1\r\n';
      setDsl(dsl);
      const mockedResponse = JSON.stringify({
        dimensionalSchemaResponse: {
          schema: ['a', 'b', 'c'],
          fieldInfo: { isNested: false, type: ColumnDataType.TABLE_REFERENCE },
        },
      });
      fetchMock.mockResponseOnce(mockedResponse);

      // Act
      await act(() => result.current.editExpression('t1', 'x', 'T1(1)'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update expression of column [x] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should recreate table with a single column using old names on the left part', async () => {
      // Arrange
      const dsl = 'table t1 [x], [b] = T1(1)[[a],[b]]';
      const expectedDsl = 'table t1 [x], [b], [c] = T1(1)[[a],[b],[c]]\r\n';
      setDsl(dsl);
      const mockedResponse = JSON.stringify({
        dimensionalSchemaResponse: {
          schema: ['a', 'b', 'c'],
          fieldInfo: { isNested: false, type: ColumnDataType.TABLE_REFERENCE },
        },
      });
      fetchMock.mockResponseOnce(mockedResponse);

      // Act
      await act(() => result.current.editExpression('t1', 'x', 'T1(1)'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update expression of column [x] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should add fields on the left side, add dim, add accessors to the input formula', async () => {
      // Arrange
      const dsl = 'table t1 [x], [b] = T1(1)[[a],[b]]';
      const expectedDsl =
        'table t1 dim [x], [b], [c] = INPUT("url")[[a],[b],[c]]\r\n';
      setDsl(dsl);
      const mockedResponse = JSON.stringify({
        dimensionalSchemaResponse: {
          schema: ['a', 'b', 'c'],
          fieldInfo: { isNested: true, type: ColumnDataType.TABLE_VALUE },
        },
      });
      fetchMock.mockResponseOnce(mockedResponse);

      // Act
      await act(() => result.current.editExpression('t1', 'x', 'INPUT("url")'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update expression of column [x] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should do nothing if no target field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      setDsl(dsl);
      fetchMock.mockResponseOnce(mockedResponse);

      await act(() => result.current.editExpression('t1', 'f2', '2 + 2'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should not remove existing dim', async () => {
      // Arrange
      const dsl = 'table t1 dim [x] = RANGE(10)\n[y] = 1';
      const expectedDsl = 'table t1 dim [x] = RANGE(8)\n[y] = 1\r\n';
      setDsl(dsl);
      const mockedResponse = JSON.stringify({
        dimensionalSchemaResponse: {
          schema: [],
          fieldInfo: { isNested: true, type: ColumnDataType.DOUBLE },
        },
      });
      fetchMock.mockResponseOnce(mockedResponse);

      // Act
      await act(() => result.current.editExpression('t1', 'x', 'RANGE(8)'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update expression of column [x] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should not add accessors with dynamic field', async () => {
      // Arrange
      const dsl =
        'table t1 dim [country], [*] = PIVOT(A[country], A[indicator], A[value], "SUM")';
      const expectedDsl =
        'table t1 dim [country], [*] = PIVOT(A[country], A[indicator], A[value], "AVG")\r\n';
      setDsl(dsl);
      const mockedResponse = JSON.stringify({
        dimensionalSchemaResponse: {
          schema: ['country', '*'],
          fieldInfo: { isNested: true, type: ColumnDataType.TABLE_VALUE },
        },
      });
      fetchMock.mockResponseOnce(mockedResponse);

      // Act
      await act(() =>
        result.current.editExpression(
          't1',
          'country',
          'PIVOT(A[country], A[indicator], A[value], "AVG")'
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update expression of column [country] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeFieldDecorator', () => {
    it('should remove field decorator', () => {
      // Arrange
      const dsl = `!layout(1, 1)\ntable t1\n!x()\n[f1]=1\n[f2]=2`;
      const expectedDsl = `!layout(1, 1)\ntable t1\n[f1]=1\n[f2]=2\r\n`;
      const historyTitle = `history message`;
      setDsl(dsl);

      // Act
      act(() =>
        result.current.removeFieldDecorator(
          't1',
          'f1',
          chartXAxisDecoratorName,
          historyTitle
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(historyTitle, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should do nothing if there is no decorator', () => {
      // Arrange
      const dsl = `!layout(1, 1)\ntable t1\n!size(2)\n[f1]=1\n[f2]=2`;
      setDsl(dsl);

      // Act
      act(() =>
        result.current.removeFieldDecorator(
          't1',
          'f1',
          chartXAxisDecoratorName,
          ''
        )
      );

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should remove field decorator (in separate line) and keep field column', () => {
      // Arrange
      const dsl = `!layout(1, 1)\ntable t1\n!x()\n[f1]=1\n[f2]=2\n`;
      const expectedDsl = `!layout(1, 1)\ntable t1\n[f1]=1\n[f2]=2\r\n`;
      const historyTitle = `history message`;
      setDsl(dsl);

      // Act
      act(() =>
        result.current.removeFieldDecorator(
          't1',
          'f1',
          chartXAxisDecoratorName,
          historyTitle
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(historyTitle, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove field decorator (in same line as field) and keep field column', () => {
      // Arrange
      const dsl = `!layout(1, 1)\ntable t1\n  !x() [f1]=1\n  [f2]=2\n`;
      const expectedDsl = `!layout(1, 1)\ntable t1\n  [f1]=1\n  [f2]=2\r\n`;
      const historyTitle = `history message`;
      setDsl(dsl);

      // Act
      act(() =>
        result.current.removeFieldDecorator(
          't1',
          'f1',
          chartXAxisDecoratorName,
          historyTitle
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(historyTitle, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove field decorator (field have multiple decorators) and keep field column', () => {
      // Arrange
      const dsl = `!layout(1, 1)\ntable t1\n  !size(2)\n  !x()\n  [f1]=1\n  [f2]=2\r\n`;
      const expectedDsl = `!layout(1, 1)\ntable t1\n  !size(2)\n  [f1]=1\n  [f2]=2\r\n`;
      const historyTitle = `history message`;
      setDsl(dsl);

      // Act
      act(() =>
        result.current.removeFieldDecorator(
          't1',
          'f1',
          chartXAxisDecoratorName,
          historyTitle
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(historyTitle, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('setFieldDecorator', () => {
    it('should add field decorator', () => {
      // Arrange
      const dsl = `!layout(1, 1)\ntable t1\n  [f1]=1\n  [f2]=2`;
      const expectedDsl = `!layout(1, 1)\ntable t1\n  !x()\n  [f1]=1\n  [f2]=2\r\n`;
      const historyTitle = `history message`;
      setDsl(dsl);

      // Act
      act(() =>
        result.current.setFieldDecorator(
          't1',
          'f1',
          chartXAxisDecoratorName,
          '',
          historyTitle
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(historyTitle, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add field decorator with value', () => {
      // Arrange
      const dsl = `!layout(1, 1)\ntable t1\n  [f1]=1\n  [f2]=2\r\n`;
      const expectedDsl = `!layout(1, 1)\ntable t1\n  !selector("some value")\n  [f1]=1\n  [f2]=2\r\n`;
      const historyTitle = `history message`;
      setDsl(dsl);

      // Act
      act(() =>
        result.current.setFieldDecorator(
          't1',
          'f1',
          chartSelectorDecoratorName,
          '"some value"',
          historyTitle
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(historyTitle, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should update decorator value', () => {
      // Arrange
      const dsl = `!layout(1, 1)\ntable t1\n!selector("some value")\n[f1]=1\n[f2]=2\r\n`;
      const expectedDsl = `!layout(1, 1)\ntable t1\n!selector("another value")\n[f1]=1\n[f2]=2\r\n`;
      const historyTitle = `history message`;
      setDsl(dsl);

      // Act
      act(() =>
        result.current.setFieldDecorator(
          't1',
          'f1',
          chartSelectorDecoratorName,
          '"another value"',
          historyTitle
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(historyTitle, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add field decorator to field with decorators (and keep field format)', () => {
      // Arrange
      const dsl = `!layout(1, 1)\ntable t1\n  !selector("some value")\n  [f1]=1\n  [f2]=2`;
      const expectedDsl = `!layout(1, 1)\ntable t1\n  !selector("some value")\n  !x()\n  [f1]=1\n  [f2]=2\r\n`;
      const historyTitle = `history message`;
      setDsl(dsl);

      // Act
      act(() =>
        result.current.setFieldDecorator(
          't1',
          'f1',
          chartXAxisDecoratorName,
          '',
          historyTitle
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(historyTitle, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('swapFieldDecorators', () => {
    it('should move field decorator to another field (target field is after source one)', () => {
      // Arrange
      const dsl = `!layout(1, 1)\ntable t1\n  !x()\n  [f1]=1\n  [f2]=2`;
      const expectedDsl = `!layout(1, 1)\ntable t1\n  [f1]=1\n  !x()\n  [f2]=2\r\n`;
      const historyTitle = `history message`;
      setDsl(dsl);

      // Act
      act(() =>
        result.current.swapFieldDecorators(
          't1',
          'f1',
          'f2',
          chartXAxisDecoratorName,
          '',
          historyTitle
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(historyTitle, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should move field decorator to another field (target field is before source one)', () => {
      // Arrange
      const dsl = `!layout(1, 1)\ntable t1\n  [f1]=1\n  !x()\n  [f2]=2`;
      const expectedDsl = `!layout(1, 1)\ntable t1\n  !x()\n  [f1]=1\n  [f2]=2\r\n`;
      const historyTitle = `history message`;
      setDsl(dsl);

      // Act
      act(() =>
        result.current.swapFieldDecorators(
          't1',
          'f2',
          'f1',
          chartXAxisDecoratorName,
          '',
          historyTitle
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(historyTitle, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should move field decorator to another field and keep format', () => {
      // Arrange
      const dsl = `!layout(1, 1)\ntable t1\n  !x()\n  [f1]=1\n  [f2]=2`;
      const expectedDsl = `!layout(1, 1)\ntable t1\n  [f1]=1\n  !x()\n  [f2]=2\r\n`;
      const historyTitle = `history message`;
      setDsl(dsl);

      // Act
      act(() =>
        result.current.swapFieldDecorators(
          't1',
          'f1',
          'f2',
          chartXAxisDecoratorName,
          '',
          historyTitle
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(historyTitle, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('addFieldWithOverride', () => {
    it('should add field with override in vertical table', () => {
      // Arrange
      const dsl = `!layout(2, 4, "title", "headers")\ntable t1\n  [f1]=1\n  [f2]=2`;
      const expectedDsl = `!layout(2, 4, "title", "headers")\ntable t1\n  [f1]=1\n  [f2]=2\r\n  [Field1]\noverride\nrow,[Field1]\n6,33\r\n`;
      setDsl(dsl);

      // Act
      act(() =>
        result.current.addFieldWithOverride({
          newFieldName: 'Field1',
          overrideCol: 6,
          overrideRow: 9,
          tableName: 't1',
          overrideValue: '33',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add new column "Field1" with override "33" to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add field with override in horizontal table', () => {
      // Arrange
      const dsl = `!layout(2, 4, "horizontal", "title", "headers")\ntable t1\n  [f1]=1\n  [f2]=2`;
      const expectedDsl = `!layout(2, 4, "horizontal", "title", "headers")\ntable t1\n  [f1]=1\n  [f2]=2\r\n  [Field1]\noverride\nrow,[Field1]\n3,33\r\n`;
      setDsl(dsl);

      // Act
      act(() =>
        result.current.addFieldWithOverride({
          newFieldName: 'Field1',
          overrideCol: 7,
          overrideRow: 5,
          tableName: 't1',
          overrideValue: '33',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add new column "Field1" with override "33" to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('addField', () => {
    beforeEach(() => {
      fetchMock.resetMocks();
    });

    const emptyResponse = JSON.stringify({});
    const mockedTableReferenceResponse = JSON.stringify({
      dimensionalSchemaResponse: {
        fieldInfo: { isNested: true, type: ColumnDataType.TABLE_REFERENCE },
        schema: ['a', 'b', 'c'],
        keys: [],
      },
    });
    const mockedTableValueResponse = JSON.stringify({
      dimensionalSchemaResponse: {
        fieldInfo: { isNested: true, type: ColumnDataType.TABLE_VALUE },
        schema: ['a', 'b', 'c'],
        keys: [],
      },
    });

    it('should add field to table', async () => {
      // Arrange
      const dsl = 'table t1\n  [f1]=1';
      const expectedDsl = 'table t1\n  [f1]=1\r\n  [f2] = 2 + 2\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(emptyResponse);

      // Act
      await act(() => result.current.addField('t1', '[f2] = 2 + 2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Add [f2] to table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add field to empty table', async () => {
      // Arrange
      const dsl = 'table t1';
      const expectedDsl = 'table t1\r\n  [f2] = 2 + 2\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(emptyResponse);

      // Act
      await act(() => result.current.addField('t1', '[f2] = 2 + 2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Add [f2] to table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add field before first field if direction is left', async () => {
      // Arrange
      const dsl = `table t1\n  [f1] = 2`;
      const expectedDsl = 'table t1\n  [field]\n  [f1] = 2\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(emptyResponse);

      // Act
      await act(() =>
        result.current.addField('t1', 'field', {
          direction: 'left',
          insertFromFieldName: 'f1',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add [field] to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add field to left with left direction and table has multiple fields', async () => {
      // Arrange
      const dsl = 'table t1\n  [f1] = 2\n  [f2] = 3\n  [f3] = 4';
      const expectedDsl =
        'table t1\n  [f1] = 2\n  [field]\n  [f2] = 3\n  [f3] = 4\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(emptyResponse);

      // Act
      await act(() =>
        result.current.addField('t1', 'field', {
          direction: 'left',
          insertFromFieldName: 'f2',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add [field] to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add field to right with right direction', async () => {
      // Arrange
      const dsl = 'table t1\n  [f1] = 2\n  [f2] = 3\n  [f3] = 4';
      const expectedDsl =
        'table t1\n  [f1] = 2\n  [field]\n  [f2] = 3\n  [f3] = 4\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(emptyResponse);

      // Act
      await act(() =>
        result.current.addField('t1', 'field', {
          direction: 'right',
          insertFromFieldName: 'f1',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add [field] to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add field at the end of the table if there is no insertFromFieldName', async () => {
      // Arrange
      const dsl = 'table t1  [f1] = 2  [f2] = 3  [f3] = 4';
      const expectedDsl =
        'table t1  [f1] = 2  [f2] = 3  [f3] = 4\r\n  [field]\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(emptyResponse);

      // Act
      await act(() =>
        result.current.addField('t1', 'field', {
          direction: 'right',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add [field] to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add field at the end of the table if there is no insertFromFieldName and direction', async () => {
      // Arrange
      const dsl = 'table t1  [f1] = 2  [f2] = 3  [f3] = 4';
      const expectedDsl =
        'table t1  [f1] = 2  [f2] = 3  [f3] = 4\r\n  [field]\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(emptyResponse);

      // Act
      await act(() => result.current.addField('t1', 'field'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add [field] to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add field with a unique generated name', async () => {
      // Arrange
      const dsl = 'table t1\n[Column1] = 1\n[Column2] = 2';
      const expectedDsl =
        'table t1\n[Column1] = 1\n[Column2] = 2\r\n  [Column3] = 3 + 3\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(emptyResponse);

      // Act
      await act(() => result.current.addField('t1', '= 3 + 3'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add [Column3] to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add table reference field group with unique names', async () => {
      // Arrange
      const dsl = 'table t1\n[a] = 1\n[b] = 2';
      const expectedDsl = 'table t1\n[a] = 1\n[b] = 2\r\n  [Column1] = t\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(mockedTableReferenceResponse);

      // Act
      await act(() => result.current.addField('t1', '= t'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add group of 1 field to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add table value field group with unique names', async () => {
      // Arrange
      const dsl = 'table t1\n[a] = 1\n[b] = 2';
      const expectedDsl =
        'table t1\n[a] = 1\n[b] = 2\r\n  [a1], [b1], [c] = INPUT("url")[[a],[b],[c]]\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(mockedTableValueResponse);

      // Act
      await act(() => result.current.addField('t1', '= INPUT("url")'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add group of 3 fields to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add field group with user provided field names', async () => {
      // Arrange
      const dsl = 'table t1\n[a] = 1\n[b] = 2';
      const expectedDsl =
        'table t1\n[a] = 1\n[b] = 2\r\n  [q], [w], [e] = INPUT("url")[[a],[b],[c]]\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(mockedTableValueResponse);

      // Act
      await act(() => result.current.addField('t1', 'q,w,e = INPUT("url")'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add group of 3 fields to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add field group when user provided field names but less than expected', async () => {
      // Arrange
      const dsl = 'table t1\n[a] = 1\n[b] = 2';
      const expectedDsl =
        'table t1\n[a] = 1\n[b] = 2\r\n  [q], [w], [c] = INPUT("url")[[a],[b],[c]]\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(mockedTableValueResponse);

      // Act
      await act(() => result.current.addField('t1', 'q,w = INPUT("url")'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add group of 3 fields to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add field group with one normalized field reference', async () => {
      // Arrange
      const dsl = 'table t1\n[a] = 1\n[b] = 2';
      const expectedDsl =
        'table t1\n[a] = 1\n[b] = 2\r\n  [c] = INPUT("url")[c]\r\n';
      setDsl(dsl);
      fetchMock.mockResponseOnce(
        JSON.stringify({
          dimensionalSchemaResponse: {
            fieldInfo: { isNested: true, type: ColumnDataType.TABLE_VALUE },
            schema: ['c'],
            keys: [],
          },
        })
      );

      // Act
      await act(() => result.current.addField('t1', '= INPUT("url")'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add group of 1 field to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('removeFieldSizes', () => {
    it('should do nothing if table does not contain custom field sizes', () => {
      // Arrange
      const dsl = 'table t1\n[a] = 1\n[b] = 2';
      setDsl(dsl);

      // Act
      act(() => result.current.removeFieldSizes('t1'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should remove all custom field sizes', () => {
      // Arrange
      const dsl =
        'table t1\n  !size(10)\n  [f1] = 1\n  !size(20)\n  [f2] = 2\n  [f3] = 2';
      const expectedDsl = 'table t1\n  [f1] = 1\n  [f2] = 2\n  [f3] = 2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.removeFieldSizes('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Remove column sizes for all fields in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('autoFitTableFields', () => {
    beforeEach(() => {
      const selection$ = new BehaviorSubject({
        startCol: 2,
        startRow: 4,
        endCol: 5,
        endRow: 8,
      });
      props = { ...initialProps };
      props.gridApi = {
        getCanvasSymbolWidth: () => 6,
        gridSizes: {
          colNumber: {
            width: 65,
          },
          cell: {
            padding: 4,
          },
        },
        selection$,
        updateSelectionAfterDataChanged: jest.fn(),
      } as any;
      jest.clearAllMocks();

      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useFieldEditDsl, Wrapper);
      result = hookRender.result;
      setDsl = hookRender.setDsl;
    });

    it('should add field to table', () => {
      // Arrange
      const dsl =
        'table t1\n  [very_very_very_long_name_field_1] = 1\n  [very_very_very_long_name_field_2] = 2';
      const expectedDsl =
        'table t1\n  !size(4)\n  [very_very_very_long_name_field_1] = 1\n  !size(4)\n  [very_very_very_long_name_field_2] = 2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.autoFitTableFields('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Auto fit all fields in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });
});
