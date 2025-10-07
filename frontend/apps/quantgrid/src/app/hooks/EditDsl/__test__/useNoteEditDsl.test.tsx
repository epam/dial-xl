import { act, RenderHookResult } from '@testing-library/react';

import { useNoteEditDsl } from '../useNoteEditDsl';
import { createWrapper, initialProps } from './createWrapper';
import { hookTestSetup } from './hookTestSetup';
import { TestWrapperProps } from './types';

describe('useNoteEditDsl', () => {
  const props: TestWrapperProps = { ...initialProps };
  let result: RenderHookResult<
    ReturnType<typeof useNoteEditDsl>,
    { dsl: string }
  >['result'];
  let setDsl: (dsl: string) => void;
  let Wrapper: React.FC<React.PropsWithChildren>;

  beforeAll(() => {
    Wrapper = createWrapper(props);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const hookRender = hookTestSetup(useNoteEditDsl, Wrapper);
    result = hookRender.result;
    setDsl = hookRender.setDsl;
  });

  describe('removeNote', () => {
    it('should remove field single line comment', () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n##comment\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.removeNote('t1', 'b'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Remove note from t1[b]`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove field multiple line comment', () => {
      // Arrange
      const dsl =
        'table t1 [a]=1\n##comment\n##multiline comment\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.removeNote('t1', 'b'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Remove note from t1[b]`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove table single line comment', () => {
      // Arrange
      const dsl = '##comment\ntable t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.removeNote('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Remove note from t1`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove table multiple line comment', () => {
      // Arrange
      const dsl =
        '##comment\n##multiline comment\ntable t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.removeNote('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Remove note from t1`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('updateNote', () => {
    describe('field note', () => {
      it('should not add or update comment if field not presented in table', () => {
        // Arrange
        const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
        const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n`;
        setDsl(dsl);

        // Act
        act(() =>
          result.current.updateNote({
            tableName: 't1',
            fieldName: 'y',
            note: 'new comment',
          })
        );

        // Assert
        expect(props.appendToFn).not.toHaveBeenCalledWith(
          `Update note for t1[b]`,
          [{ sheetName: props.sheetName, content: expectedDsl }]
        );
        expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should add comment', () => {
        // Arrange
        const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
        const expectedDsl = `table t1 [a]=1\n##new comment\n  [b]=2\n[c]=3\r\n`;
        setDsl(dsl);

        // Act
        act(() =>
          result.current.updateNote({
            tableName: 't1',
            fieldName: 'b',
            note: 'new comment',
          })
        );

        // Assert
        expect(props.appendToFn).toHaveBeenCalledWith(`Update note for t1[b]`, [
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should update single line comment', () => {
        // Arrange
        const dsl = 'table t1 [a]=1\n##comment\n[b]=2\n[c]=3';
        const expectedDsl = `table t1 [a]=1\n##updated comment\n  [b]=2\n[c]=3\r\n`;
        setDsl(dsl);

        // Act
        act(() =>
          result.current.updateNote({
            tableName: 't1',
            fieldName: 'b',
            note: 'updated comment',
          })
        );

        // Assert
        expect(props.appendToFn).toHaveBeenCalledWith(`Update note for t1[b]`, [
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should update multiline comment', () => {
        // Arrange
        const dsl = 'table t1 [a]=1\n##comment\n##comment1\n[b]=2\n[c]=3';
        const expectedDsl = `table t1 [a]=1\n##comment\n  ##comment1\n  ##another line\n  [b]=2\n[c]=3\r\n`;
        setDsl(dsl);

        // Act
        act(() =>
          result.current.updateNote({
            tableName: 't1',
            fieldName: 'b',
            note: 'comment\ncomment1\nanother line',
          })
        );

        // Assert
        expect(props.appendToFn).toHaveBeenCalledWith(`Update note for t1[b]`, [
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });
    });
    describe('table note', () => {
      it('should not add or update comment if table not presented', () => {
        // Arrange
        const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
        const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n`;
        setDsl(dsl);

        // Act
        act(() =>
          result.current.updateNote({
            tableName: 'tttttt',
            note: 'new comment',
          })
        );

        // Assert
        expect(props.appendToFn).not.toHaveBeenCalledWith(
          `Update note for t1`,
          [{ sheetName: props.sheetName, content: expectedDsl }]
        );
        expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });
      it('should add comment', () => {
        // Arrange
        const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
        const expectedDsl = `##new comment\ntable t1 [a]=1\n[b]=2\n[c]=3\r\n`;
        setDsl(dsl);

        // Act
        act(() =>
          result.current.updateNote({
            tableName: 't1',
            note: 'new comment',
          })
        );

        // Assert
        expect(props.appendToFn).toHaveBeenCalledWith(`Update note for t1`, [
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });
      it('should update single line comment', () => {
        // Arrange
        const dsl = '##comment\ntable t1 [a]=1\n[b]=2\n[c]=3';
        const expectedDsl = `##updated comment\ntable t1 [a]=1\n[b]=2\n[c]=3\r\n`;
        setDsl(dsl);

        // Act
        act(() =>
          result.current.updateNote({
            tableName: 't1',
            note: 'updated comment',
          })
        );

        // Assert
        expect(props.appendToFn).toHaveBeenCalledWith(`Update note for t1`, [
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });

      it('should update multiline comment', () => {
        // Arrange
        const dsl = '##comment\n##comment1\ntable t1 [a]=1\n[b]=2\n[c]=3';
        const expectedDsl = `##comment\n##comment1\n##another line\ntable t1 [a]=1\n[b]=2\n[c]=3\r\n`;
        setDsl(dsl);

        // Act
        act(() =>
          result.current.updateNote({
            tableName: 't1',
            note: 'comment\ncomment1\nanother line',
          })
        );

        // Assert
        expect(props.appendToFn).toHaveBeenCalledWith(`Update note for t1`, [
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
        expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
          { sheetName: props.sheetName, content: expectedDsl },
        ]);
      });
    });
  });
});
