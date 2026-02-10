import { getNotLoadedChunks } from '../getNotLoadedChunks';

describe('getNotLoadedChunks', () => {
  it('should return nothing when all data loaded', () => {
    // Arrange
    const fields = ['f1', 'f2', 'f3'];
    const chunks = {
      0: {
        f1: new Array(100),
        f2: new Array(100),
        f3: new Array(100),
      },
    };

    // Act
    const notLoadedChunks = getNotLoadedChunks(chunks, fields, 0, 40);

    // Assert
    expect(notLoadedChunks?.startRow).toBeUndefined();
    expect(notLoadedChunks?.endRow).toBeUndefined();
    expect(notLoadedChunks?.fields).toBeUndefined();
  });

  it('should return all not loaded chunks when chunks are empty', () => {
    // Arrange
    const chunks = {};
    const fields = ['f1', 'f2', 'f3'];
    const expectedFields = new Set(fields);

    // Act
    const notLoadedChunks = getNotLoadedChunks(chunks, fields, 0, 40);

    // Assert
    expect(notLoadedChunks?.startRow).toEqual(0);
    expect(notLoadedChunks?.endRow).toEqual(500);
    expect(notLoadedChunks?.fields).toEqual(expectedFields);
  });

  it('should return only not loaded fields', () => {
    // Arrange
    const chunks = {
      0: {
        f1: new Array(100),
      },
    };
    const fields = ['f1', 'f2', 'f3'];
    const expectedFields = new Set(fields.slice(1));

    // Act
    const notLoadedChunks = getNotLoadedChunks(chunks, fields, 0, 40);

    // Assert
    expect(notLoadedChunks?.startRow).toEqual(0);
    expect(notLoadedChunks?.endRow).toEqual(500);
    expect(notLoadedChunks?.fields).toEqual(expectedFields);
  });
});
