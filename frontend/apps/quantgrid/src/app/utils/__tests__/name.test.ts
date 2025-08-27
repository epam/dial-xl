import { FilesMetadata } from '@frontend/common';

import {
  constructPath,
  convertUrlToMetadata,
  decodeApiUrl,
  doesHaveDotsInTheEnd,
  encodeApiUrl,
  hasInvalidNameInPath,
  isEntityNameInvalid,
  isProjectMetadata,
  notAllowedSymbols,
  safeEncodeURIComponent,
} from '../name';

describe('name utils', () => {
  describe('doesHaveDotsInTheEnd', () => {
    it('should return true when string ends with a dot', () => {
      expect(doesHaveDotsInTheEnd('test.')).toBe(true);
      expect(doesHaveDotsInTheEnd('test..')).toBe(true);
      expect(doesHaveDotsInTheEnd('test . ')).toBe(true);
    });

    it("should return false when string doesn't end with a dot", () => {
      expect(doesHaveDotsInTheEnd('test')).toBe(false);
      expect(doesHaveDotsInTheEnd('test.txt')).toBe(false);
      expect(doesHaveDotsInTheEnd('')).toBe(false);
      expect(doesHaveDotsInTheEnd(' ')).toBe(false);
    });
  });

  describe('isEntityNameInvalid', () => {
    it('should return true for names with not allowed symbols', () => {
      // Test each not allowed symbol
      notAllowedSymbols.split('').forEach((symbol) => {
        expect(isEntityNameInvalid(`test${symbol}name`)).toBe(true);
      });
    });

    it('should return true for names with control characters', () => {
      expect(isEntityNameInvalid('test\nname')).toBe(true);
      expect(isEntityNameInvalid('test\rname')).toBe(true);
      expect(isEntityNameInvalid('test\tname')).toBe(true);
      expect(isEntityNameInvalid('test\u0001name')).toBe(true);
    });

    it('should return true for names ending with dots', () => {
      expect(isEntityNameInvalid('test.')).toBe(true);
      expect(isEntityNameInvalid('test..')).toBe(true);
    });

    it('should return false for valid names', () => {
      expect(isEntityNameInvalid('test')).toBe(false);
      expect(isEntityNameInvalid('test-name')).toBe(false);
      expect(isEntityNameInvalid('test_name')).toBe(false);
      expect(isEntityNameInvalid('test.name')).toBe(false);
    });

    it('should ignore dot in the end check when skipDotInTheEndCheck is true', () => {
      expect(isEntityNameInvalid('test.', true)).toBe(false);
      expect(isEntityNameInvalid('test..', true)).toBe(false);
      // Should still catch other invalid characters
      expect(isEntityNameInvalid('test:name', true)).toBe(true);
    });
  });

  describe('hasInvalidNameInPath', () => {
    it('should return true if any part of the path has invalid name', () => {
      expect(hasInvalidNameInPath('valid/invalid:/path')).toBe(true);
      expect(hasInvalidNameInPath('valid/invalid./path')).toBe(true);
      expect(hasInvalidNameInPath('valid/path/with\ninvalid')).toBe(true);
    });

    it('should return false if all parts of the path are valid', () => {
      expect(hasInvalidNameInPath('valid/path/here')).toBe(false);
      expect(hasInvalidNameInPath('valid/path.with.dots/here')).toBe(false);
      expect(hasInvalidNameInPath('')).toBe(false); // Empty path
    });
  });

  describe('safeEncodeURIComponent', () => {
    it('should encode regular characters correctly', () => {
      expect(safeEncodeURIComponent('test name')).toBe('test%20name');
      expect(safeEncodeURIComponent('test?name')).toBe('test%3Fname');
      expect(safeEncodeURIComponent('test+name')).toBe('test%2Bname');
    });

    it('should handle surrogate pairs correctly', () => {
      // Emoji (surrogate pair) should remain unchanged
      const emoji = '😀';
      expect(safeEncodeURIComponent(emoji)).toBe(emoji);

      // Mix of regular text and emoji
      expect(safeEncodeURIComponent(`test ${emoji} name`)).toBe(
        `test%20${emoji}%20name`
      );
    });
  });

  describe('encodeApiUrl', () => {
    it('should encode each part of the path separately', () => {
      expect(encodeApiUrl('path/to file/resource')).toBe(
        'path/to%20file/resource'
      );
      expect(encodeApiUrl('path/to?file/resource')).toBe(
        'path/to%3Ffile/resource'
      );
    });

    it('should handle empty path', () => {
      expect(encodeApiUrl('')).toBe('');
    });

    it('should preserve slashes', () => {
      expect(encodeApiUrl('/path/to/file/')).toBe('/path/to/file/');
    });
  });

  describe('decodeApiUrl', () => {
    it('should decode each part of the path separately', () => {
      expect(decodeApiUrl('path/to%20file/resource')).toBe(
        'path/to file/resource'
      );
      expect(decodeApiUrl('path/to%3Ffile/resource')).toBe(
        'path/to?file/resource'
      );
    });

    it('should handle empty path', () => {
      expect(decodeApiUrl('')).toBe('');
    });

    it('should preserve slashes', () => {
      expect(decodeApiUrl('/path/to/file/')).toBe('/path/to/file/');
    });
  });

  describe('constructPath', () => {
    it('should join non-empty elements with slashes', () => {
      expect(constructPath(['path', 'to', 'file'])).toBe('path/to/file');
    });

    it('should filter out null and undefined values', () => {
      expect(constructPath(['path', null, 'to', undefined, 'file'])).toBe(
        'path/to/file'
      );
    });

    it('should handle empty array', () => {
      expect(constructPath([])).toBe('');
    });

    it('should handle array with only null/undefined values', () => {
      expect(constructPath([null, undefined])).toBe('');
    });
  });

  describe('convertUrlToMetadata', () => {
    it('should convert file URL to metadata correctly', () => {
      const url = 'file/bucket/path/to/filename.txt';
      const expected = {
        name: 'filename.txt',
        resourceType: 'FILE',
        bucket: 'bucket',
        parentPath: 'path/to',
        url: url,
        nodeType: 'ITEM',
      };
      expect(convertUrlToMetadata(url)).toEqual(expected);
    });

    it('should convert conversation URL to metadata correctly', () => {
      const url = 'conversations/bucket/path/to/conversation';
      const expected = {
        name: 'conversation',
        resourceType: 'CONVERSATION',
        bucket: 'bucket',
        parentPath: 'path/to',
        url: url,
        nodeType: 'ITEM',
      };
      expect(convertUrlToMetadata(url)).toEqual(expected);
    });

    it('should handle folder URLs correctly', () => {
      const url = 'file/bucket/path/to/folder/';
      const expected = {
        name: 'folder',
        resourceType: 'FILE',
        bucket: 'bucket',
        parentPath: 'path/to',
        url: url,
        nodeType: 'FOLDER',
      };
      expect(convertUrlToMetadata(url)).toEqual(expected);
    });

    it('should handle encoded URLs', () => {
      const url = 'file/bucket/path/to%20file/file%20name.txt';
      const expected = {
        name: 'file name.txt',
        resourceType: 'FILE',
        bucket: 'bucket',
        parentPath: 'path/to file',
        url: url,
        nodeType: 'ITEM',
      };
      expect(convertUrlToMetadata(url)).toEqual(expected);
    });

    it('should return undefined for invalid URLs', () => {
      expect(convertUrlToMetadata('')).toBeUndefined();
      expect(convertUrlToMetadata('file/bucket')).toBeUndefined();
      expect(convertUrlToMetadata('file')).toBeUndefined();
    });
  });

  describe('isProjectMetadata', () => {
    it('should return true for project files', () => {
      const meta = {
        resourceType: 'FILE',
        nodeType: 'ITEM',
        name: 'project.qg',
      } as FilesMetadata;
      expect(isProjectMetadata(meta)).toBe(true);
    });

    it('should return false for non-project files', () => {
      // Wrong extension
      expect(
        isProjectMetadata({
          resourceType: 'FILE',
          nodeType: 'ITEM',
          name: 'project.txt',
        } as FilesMetadata)
      ).toBe(false);

      // Wrong resource type
      expect(
        isProjectMetadata({
          resourceType: 'CONVERSATION',
          nodeType: 'ITEM',
          name: 'project.qg',
        } as FilesMetadata)
      ).toBe(false);

      // Wrong node type
      expect(
        isProjectMetadata({
          resourceType: 'FILE',
          nodeType: 'FOLDER',
          name: 'project.qg',
        } as FilesMetadata)
      ).toBe(false);
    });
  });
});
