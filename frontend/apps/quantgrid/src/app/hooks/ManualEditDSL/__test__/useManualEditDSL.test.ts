import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';

import { WorksheetState } from '@frontend/common';
import { ParsedSheets, SheetReader } from '@frontend/parser';
import { act } from '@testing-library/react';

import { getRenderedHook } from './utils';

enableFetchMocks();

let props = {
  appendFn: jest.fn(),
  appendToFn: jest.fn(),
  updateSheetContent: jest.fn(() => true),
  manuallyUpdateSheetContent: jest.fn(() => true),
  projectName: 'project1',
  sheetName: 'sheet1',
  projectSheets: [] as WorksheetState[],
  parsedSheets: {} as ParsedSheets,
};

describe('useManualEditDSL', () => {
  beforeEach(() => {
    props = {
      appendFn: jest.fn(),
      appendToFn: jest.fn(),
      updateSheetContent: jest.fn(() => true),
      manuallyUpdateSheetContent: jest.fn(() => true),
      projectName: 'project1',
      sheetName: 'sheet1',
      projectSheets: [] as WorksheetState[],
      parsedSheets: {} as ParsedSheets,
    };

    jest.clearAllMocks();
    jest.clearAllTimers();
    fetchMock.resetMocks();
  });

  describe('onCloneTable', () => {
    it('should clone table with some default placement', async () => {
      // Arrange
      const dsl = '!layout(1, 1)\r\ntable t1\r\n[a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `!layout(1, 1)\r\ntable t1\r\n[a]=1\r\n[b]=2\r\n[c]=3\r\n\r\n!layout(2, 2)\r\ntable 't1 clone'\r\n[a]=1\r\n[b]=2\r\n[c]=3\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.onCloneTable('t1'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Cloned table "t1" with new name "'t1 clone'"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should clone table with escaped name and create unique name', async () => {
      // Arrange
      const dsl = `!layout(7,4,"title")\ntable '''Table1 clone'' clone'\n[Field1] = 123\n!layout(8, 5, "title")\ntable '''Table1 clone'' clone clone'\n[Field1] = 123`;
      const expectedDsl = `!layout(7,4,"title")\ntable '''Table1 clone'' clone'\n[Field1] = 123\n!layout(8, 5, "title")\ntable '''Table1 clone'' clone clone'\n[Field1] = 123\r\n\r\n!layout(8, 5, "title")\r\ntable '''Table1 clone'' clone clone1'\n[Field1] = 123\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.onCloneTable(`'''Table1 clone'' clone'`));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Cloned table "'''Table1 clone'' clone'" with new name "'''Table1 clone'' clone clone1'"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('moveTableToSheet', () => {
    it('should move table from one sheet to another without other tables', async () => {
      // Arrange
      const projectName = 'Project';

      const sourceSheetName = 'Sheet1';
      const dslSourceSheet = `table t1 [Field1] = 123`;
      const expectedDslSourceSheet = `\r\n`;

      const destinationSheetName = 'Sheet2';
      const dslDestinationSheet = ``;
      const expectedDslDestinationSheet = `\r\ntable t1 [Field1] = 123\r\n`;

      props.projectSheets = [
        {
          sheetName: sourceSheetName,
          projectName,
          content: dslSourceSheet,
        },
        {
          sheetName: destinationSheetName,
          projectName,
          content: dslDestinationSheet,
        },
      ] as WorksheetState[];
      props.sheetName = sourceSheetName;
      const hook = getRenderedHook(dslSourceSheet, props);
      // Act
      await new Promise(process.nextTick);
      act(() => hook.moveTableToSheet('t1', 'Sheet1', 'Sheet2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Move table "t1" from sheet "Sheet1" to sheet "Sheet2"`,
        [
          { sheetName: sourceSheetName, content: expectedDslSourceSheet },
          {
            sheetName: destinationSheetName,
            content: expectedDslDestinationSheet,
          },
        ]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: sourceSheetName, content: expectedDslSourceSheet },
        {
          sheetName: destinationSheetName,
          content: expectedDslDestinationSheet,
        },
      ]);
    });
    it('should move table from one sheet to another when other other tables presented', async () => {
      // Arrange
      const projectName = 'Project';

      const sourceSheetName = 'Sheet1';
      const dslSourceSheet = `table t0 [Field1] = 123\r\ntable t1 [Field1] = 123\r\ntable t2 [Field1] = 123`;
      const expectedDslSourceSheet = `table t0 [Field1] = 123\r\n\r\ntable t2 [Field1] = 123\r\n`;

      const destinationSheetName = 'Sheet2';
      const dslDestinationSheet = `table p0 [Field1] = 123\r\ntable p2 [Field1] = 123`;
      const expectedDslDestinationSheet = `table p0 [Field1] = 123\r\ntable p2 [Field1] = 123\r\ntable t1 [Field1] = 123\r\n`;

      props.projectSheets = [
        {
          sheetName: sourceSheetName,
          projectName,
          content: dslSourceSheet,
        },
        {
          sheetName: destinationSheetName,
          projectName,
          content: dslDestinationSheet,
        },
      ] as WorksheetState[];
      props.sheetName = sourceSheetName;
      const hook = getRenderedHook(dslSourceSheet, props);
      // Act
      await new Promise(process.nextTick);
      act(() => hook.moveTableToSheet('t1', 'Sheet1', 'Sheet2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Move table "t1" from sheet "Sheet1" to sheet "Sheet2"`,
        [
          { sheetName: sourceSheetName, content: expectedDslSourceSheet },
          {
            sheetName: destinationSheetName,
            content: expectedDslDestinationSheet,
          },
        ]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: sourceSheetName, content: expectedDslSourceSheet },
        {
          sheetName: destinationSheetName,
          content: expectedDslDestinationSheet,
        },
      ]);
    });
    it('should move table from not current sheet to current sheet', async () => {
      // Arrange
      const projectName = 'Project';

      const sourceSheetName = 'Sheet1';
      const dslSourceSheet = `table t1 [Field1] = 123`;
      const expectedDslSourceSheet = `\r\n`;

      const destinationSheetName = 'Sheet2';
      const dslDestinationSheet = ``;
      const expectedDslDestinationSheet = `\r\ntable t1 [Field1] = 123\r\n`;

      props.projectSheets = [
        {
          sheetName: sourceSheetName,
          projectName,
          content: dslSourceSheet,
        },
        {
          sheetName: destinationSheetName,
          projectName,
          content: dslDestinationSheet,
        },
      ] as WorksheetState[];
      props.parsedSheets = {
        [sourceSheetName]: SheetReader.parseSheet(dslSourceSheet),
        [destinationSheetName]: SheetReader.parseSheet(dslDestinationSheet),
      };

      props.sheetName = destinationSheetName;
      const hook = getRenderedHook(dslDestinationSheet, props);
      // Act
      await new Promise(process.nextTick);
      act(() => hook.moveTableToSheet('t1', 'Sheet1', 'Sheet2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Move table "t1" from sheet "Sheet1" to sheet "Sheet2"`,
        [
          { sheetName: sourceSheetName, content: expectedDslSourceSheet },
          {
            sheetName: destinationSheetName,
            content: expectedDslDestinationSheet,
          },
        ]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: sourceSheetName, content: expectedDslSourceSheet },
        {
          sheetName: destinationSheetName,
          content: expectedDslDestinationSheet,
        },
      ]);
    });
  });
});
