import { act, RenderHookResult } from '@testing-library/react';

import { useRenameFieldDsl } from '../useRenameFieldDsl';
import { createWrapper, initialProps } from './createWrapper';
import { hookTestSetup } from './hookTestSetup';
import { TestWrapperProps } from './types';

describe('useRenameFieldDsl', () => {
  const props: TestWrapperProps = { ...initialProps };
  let hook: RenderHookResult<
    ReturnType<typeof useRenameFieldDsl>,
    { dsl: string }
  >['result'];
  let setDsl: (dsl: string) => void;
  let Wrapper: React.FC<React.PropsWithChildren>;

  beforeAll(() => {
    Wrapper = createWrapper(props);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const hookRender = hookTestSetup(useRenameFieldDsl, Wrapper);
    hook = hookRender.result;
    setDsl = hookRender.setDsl;
  });

  describe('renameField', () => {
    it('should rename table with one field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t1 [f6]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.renameField('t1', 'f1', 'f6'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename column [f1] to [f6] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should rename table field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2';
      const expectedDsl = 'table t1 [f5]=1\n[f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.renameField('t1', 'f1', 'f5'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename column [f1] to [f5] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should sanitize field name when rename column', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2';
      const expectedDsl = 'table t1 [f4]=1\n[f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.renameField('t1', 'f1', '[f4]'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename column [f1] to [f4] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should not rename if new name is the same', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2';
      setDsl(dsl);

      // Act
      act(() => hook.current.renameField('t1', 'f1', 'f1'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });
    it('should rename override field in table with keys', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n[f2]=2\noverride\n[f1],[f2]\n1,3';
      const expectedDsl =
        'table t1 key [f1]=1\n[f3]=2\noverride\n[f1],[f3]\n1,3\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.renameField('t1', 'f2', 'f3'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename column [f2] to [f3] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should rename override field in table without keys', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2\noverride\nrow,[f2]\n1,3';
      const expectedDsl =
        'table t1 [f1]=1\n[f3]=2\noverride\nrow,[f3]\n1,3\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.renameField('t1', 'f2', 'f3'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename column [f2] to [f3] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should rename override field in manual table', () => {
      // Arrange
      const dsl = '!manual() table t1 [f1]=1\n[f2]=2\noverride\n[f2]\n3';
      const expectedDsl =
        '!manual() table t1 [f1]=1\n[f3]=2\noverride\n[f3]\n3\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.renameField('t1', 'f2', 'f3'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename column [f2] to [f3] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should rename column in apply sort section', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2\napply\nsort [f1]';
      const expectedDsl = 'table t1 [f3]=1\n[f2]=2\napply\nsort [f3]\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.renameField('t1', 'f1', 'f3'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename column [f1] to [f3] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should rename column in apply filter section', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2\napply\nfilter [f1] >= 1';
      const expectedDsl =
        'table t1 [f3]=1\n[f2]=2\napply\nfilter [f3] >= 1\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.renameField('t1', 'f1', 'f3'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename column [f1] to [f3] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should rename column in apply filter section (complex filter)', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2\napply\nfilter NOT CONTAINS([f1],1)';
      const expectedDsl =
        'table t1 [f3]=1\n[f2]=2\napply\nfilter NOT CONTAINS([f3],1)\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.renameField('t1', 'f1', 'f3'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename column [f1] to [f3] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should rename column in both apply sections', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\n[f2]=2\napply\nsort -[f1]\nfilter [f1] >= 1';
      const expectedDsl =
        'table t1 [f3]=1\n[f2]=2\napply\nsort -[f3]\nfilter [f3] >= 1\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.renameField('t1', 'f1', 'f3'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename column [f1] to [f3] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should rename column in total section', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2\ntotal\n[f1]=SUM(t1[f1])';
      const expectedDsl =
        'table t1 [f3]=1\n[f2]=2\ntotal\n  [f3] = SUM(t1[f3])\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.renameField('t1', 'f1', 'f3'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename column [f1] to [f3] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should rename each field entry in total section', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\n[f2]=2\ntotal\n[f1]=SUM(t1[f1])\ntotal\n[f1]=COUNT(t1[f1])\ntotal\n[f1]=MAX(t1[f1])';
      const expectedDsl =
        'table t1 [f3]=1\n[f2]=2\ntotal\n  [f3] = SUM(t1[f3])\ntotal\n  [f3] = COUNT(t1[f3])\ntotal\n  [f3] = MAX(t1[f3])\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.renameField('t1', 'f1', 'f3'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename column [f1] to [f3] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });
});
