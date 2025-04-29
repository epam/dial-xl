import { removeOldestHistoryItems, UndoRedoHistory } from '../history';

describe('removeOldestHistoryItems', () => {
  it('should remove up to 5 oldest items across multiple projects', () => {
    // Arrange
    const historyObj: UndoRedoHistory = {
      projectA: [
        { title: 'A1', time: 100, sheetsState: {} },
        { title: 'A2', time: 200, sheetsState: {} },
      ],
      projectB: [
        { title: 'B1', time: 50, sheetsState: {} },
        { title: 'B2', time: 300, sheetsState: {} },
        { title: 'B3', time: 400, sheetsState: {} },
      ],
      projectC: [{ title: 'C1', time: 25, sheetsState: {} }],
    };

    // Act
    removeOldestHistoryItems(historyObj, 5);

    // Assert
    expect(historyObj.projectA).toBeUndefined();
    expect(historyObj.projectC).toBeUndefined();
    expect(historyObj.projectB).toHaveLength(1);
    expect(historyObj.projectB?.[0].time).toBe(400);
  });

  it('should remove fewer items if total is less than "count"', () => {
    // Arrange
    const historyObj: UndoRedoHistory = {
      projectA: [
        { title: 'A1', time: 10, sheetsState: {} },
        { title: 'A2', time: 20, sheetsState: {} },
      ],
    };

    // Act
    removeOldestHistoryItems(historyObj, 5);
    // We asked to remove 5, but only 2 exist.

    // Assert
    expect(Object.keys(historyObj).length).toBe(0);
    expect(historyObj.projectA).toBeUndefined();
  });

  it('should remove the N oldest items', () => {
    // Arrange
    const historyObj: UndoRedoHistory = {
      projectX: [
        { title: 'x1', time: 5, sheetsState: {} },
        { title: 'x2', time: 15, sheetsState: {} },
        { title: 'x3', time: 25, sheetsState: {} },
      ],
      projectY: [
        { title: 'y1', time: 1, sheetsState: {} },
        { title: 'y2', time: 30, sheetsState: {} },
      ],
    };

    // Act
    removeOldestHistoryItems(historyObj, 2);

    // Assert
    expect(historyObj.projectY).toHaveLength(1);
    expect(historyObj.projectY?.[0].time).toBe(30);
    expect(historyObj.projectX).toHaveLength(2);
    expect(historyObj.projectX?.[0].time).toBe(15);
    expect(historyObj.projectX?.[1].time).toBe(25);
  });

  it('should not remove anything if there are no valid time entries', () => {
    // Arrange
    const historyObj: UndoRedoHistory = {
      projectA: [],
      projectB: [
        { title: 'B1', time: undefined as unknown as number, sheetsState: {} },
      ],
    };

    // Act
    removeOldestHistoryItems(historyObj, 5);

    // Assert
    expect(historyObj.projectA).toBeDefined();
    expect(historyObj.projectB).toHaveLength(1);
  });

  it('should remove exactly the oldest 5 if there are more than 5 items', () => {
    // Arrange
    const historyObj: UndoRedoHistory = {
      p1: [
        { title: '1', time: 1, sheetsState: {} },
        { title: '2', time: 2, sheetsState: {} },
      ],
      p2: [
        { title: '3', time: 3, sheetsState: {} },
        { title: '4', time: 4, sheetsState: {} },
        { title: '5', time: 5, sheetsState: {} },
        { title: '6', time: 6, sheetsState: {} },
      ],
    };

    // Act
    removeOldestHistoryItems(historyObj, 5);

    // Assert
    expect(historyObj.p1).toBeUndefined();
    expect(historyObj.p2).toHaveLength(1);
    expect(historyObj.p2?.[0].time).toBe(6);
  });
});
