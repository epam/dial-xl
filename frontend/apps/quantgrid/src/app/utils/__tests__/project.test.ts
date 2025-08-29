import { encodeApiUrl } from '../name';
import {
  collectFilesFromProject,
  updateFilesPathInputsInProject,
} from '../project';

function prepareSheets(content: string) {
  return [
    {
      content,
      projectName: 'test_project',
      sheetName: 'Sheet1',
    },
  ];
}

describe('updateFilesPathInputsInProject', () => {
  const newPath = '2tPJCVWm/appdata/xl/test_clone (2)';
  const encodedNewPath = encodeApiUrl(newPath);

  it('updates paths that already point to the same project', () => {
    // Arrange
    const sheets = prepareSheets(
      'dim [src] = INPUT("files/2tPJCVWm/appdata/xl/test_clone/departments.csv")'
    );

    // Act
    const [{ content: result }] = updateFilesPathInputsInProject(
      sheets,
      newPath
    );

    // Assert
    expect(result).toBe(
      `dim [src] = INPUT("files/${encodedNewPath}/departments.csv")`
    );
  });

  it('updates a path that points to a different bucket and project (with appdata/xl)', () => {
    const sheets = prepareSheets(
      'dim [x] = INPUT("files/3aPFKVNw/appdata/xl/another_project/HR/departments4.csv")'
    );

    const [{ content: result }] = updateFilesPathInputsInProject(
      sheets,
      newPath
    );

    expect(result).toBe(
      `dim [x] = INPUT("files/${encodedNewPath}/departments4.csv")`
    );
  });

  it('updates a path that has no appdata/xl segment', () => {
    const sheets = prepareSheets(
      'dim [x] = INPUT("files/3aPFKVNw/another_project/history.csv")'
    );

    const [{ content: result }] = updateFilesPathInputsInProject(
      sheets,
      newPath
    );

    expect(result).toBe(
      `dim [x] = INPUT("files/${encodedNewPath}/history.csv")`
    );
  });

  it('updates a file that lives at the bucket root', () => {
    const sheets = prepareSheets(
      'dim [x] = INPUT("files/3aPFKVNw/my_file.csv")'
    );

    const [{ content: result }] = updateFilesPathInputsInProject(
      sheets,
      newPath
    );

    expect(result).toBe(
      `dim [x] = INPUT("files/${encodedNewPath}/my_file.csv")`
    );
  });

  it('leaves non-storage URLs unchanged', () => {
    const sheets = prepareSheets(
      'dim [x] = INPUT("https://example.com/external/file.csv")'
    );

    const [{ content: result }] = updateFilesPathInputsInProject(
      sheets,
      newPath
    );

    expect(result).toBe(
      'dim [x] = INPUT("https://example.com/external/file.csv")'
    );
  });
});

describe('collectFilesFromProject', () => {
  // Test for basic functionality
  it('updates paths that already point to the same project', () => {
    const sheets: string[] = [
      `
      table T
      [src] = INPUT("files/2tPJCVWm/appdata/xl/test_clone/departments.csv")[[field], [field2]]
      `,
    ];
    const expectedFiles: string[] = [
      'files/2tPJCVWm/appdata/xl/test_clone/departments.csv',
      'files/2tPJCVWm/appdata/xl/test_clone/.departments.schema',
    ];
    const result = collectFilesFromProject(sheets);
    expect(result).toStrictEqual(expectedFiles);
  });

  // Test for empty input
  it('returns an empty array for an empty input array', () => {
    const sheets: string[] = [];
    const expectedFiles: string[] = [];
    const result = collectFilesFromProject(sheets);
    expect(result).toStrictEqual(expectedFiles);
  });

  it('returns an empty array for sheets with no content', () => {
    const sheets: string[] = [''];
    const expectedFiles: string[] = [];
    const result = collectFilesFromProject(sheets);
    expect(result).toStrictEqual(expectedFiles);
  });

  // Test for no INPUT expressions
  it('returns an empty array for sheets without INPUT expressions', () => {
    const sheets: string[] = [
      'table T\n[src] = SMTHELSE("some/path.csv")[[field], [field2]]',
    ];
    const expectedFiles: string[] = [];
    const result = collectFilesFromProject(sheets);
    expect(result).toStrictEqual(expectedFiles);
  });

  // Test for deduplication within the same sheet
  it('deduplicates file paths within the same sheet', () => {
    const sheets: string[] = [
      `
      table T
      [src] = INPUT("files/duplicate.csv")[]
      [src2] = INPUT("files/duplicate.csv")[]
      `,
    ];
    const expectedFiles: string[] = [
      'files/duplicate.csv',
      'files/.duplicate.schema',
    ];
    const result = collectFilesFromProject(sheets);
    expect(result).toStrictEqual(expectedFiles);
  });

  // Test for deduplication across different sheets
  it('deduplicates file paths across different sheets', () => {
    const sheets: string[] = [
      'table T\n[src] = INPUT("files/shared.csv")[[]]',
      'table U\n[src] = INPUT("files/shared.csv")[[]]',
    ];
    const expectedFiles: string[] = [
      'files/shared.csv',
      'files/.shared.schema',
    ];
    const result = collectFilesFromProject(sheets);
    expect(result).toStrictEqual(expectedFiles);
  });

  // Test for multiple files in a single sheet
  it('handles multiple different file paths in a single sheet', () => {
    const sheets: string[] = [
      `
      table T
      [src] = INPUT("files/one.csv")[]
      [src2] = INPUT("files/two.csv")[]
      `,
    ];
    const expectedFiles: string[] = [
      'files/one.csv',
      'files/.one.schema',
      'files/two.csv',
      'files/.two.schema',
    ];
    const result = collectFilesFromProject(sheets);
    expect(result).toStrictEqual(expectedFiles);
  });

  // Test for different files across multiple sheets
  it('handles different file paths across multiple sheets', () => {
    const sheets: string[] = [
      'table T\n[src] = INPUT("files/file1.csv")[[]]',
      'table U\n[src] = INPUT("files/file2.csv")[[]]',
    ];
    const expectedFiles: string[] = [
      'files/file1.csv',
      'files/.file1.schema',
      'files/file2.csv',
      'files/.file2.schema',
    ];
    const result = collectFilesFromProject(sheets);
    expect(result).toStrictEqual(expectedFiles);
  });

  // Test for malformed INPUT expressions
  it('handles malformed INPUT expressions gracefully', () => {
    const sheets: string[] = [
      `
      table T
      [src] = INPUT("files/malformed.csv"
      `,
    ];
    const expectedFiles: string[] = []; // Should return an empty result due to malformed input
    const result = collectFilesFromProject(sheets);
    expect(result).toStrictEqual(expectedFiles);
  });

  // Test for path format with special characters
  it('handles paths with special characters', () => {
    const sheets: string[] = [
      `
      table T
      [src] = INPUT("/files!/@special#chars$.csv")[]
      `,
    ];
    const expectedFiles: string[] = [
      '/files!/@special#chars$.csv',
      '/files!/.@special#chars$.schema',
    ];
    const result = collectFilesFromProject(sheets);
    expect(result).toStrictEqual(expectedFiles);
  });
});
