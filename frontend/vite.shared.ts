import path from 'path';

const MOCKS_DIR = 'apps/quantgrid/__mocks__';

/**
 * Returns test alias configurations for mocking heavy dependencies during tests.
 * @param rootDir - The root directory of the project (typically __dirname of vite.config)
 * @param pathToRoot - Relative path from the config file to the project root (e.g., '../..' for libs)
 */
export function getTestAliases(rootDir: string, pathToRoot: string = '') {
  const mocksDir = path.resolve(rootDir, pathToRoot, MOCKS_DIR);

  return [
    {
      find: /^monaco-editor(\/.*)?$/,
      replacement: path.resolve(mocksDir, 'monaco-editor.ts'),
    },
    {
      find: /^pixi\.js$/,
      replacement: path.resolve(mocksDir, 'pixi.js.ts'),
    },
    {
      find: 'react-markdown',
      replacement: path.resolve(mocksDir, 'react-markdown.tsx'),
    },
    {
      find: 'remark-gfm',
      replacement: path.resolve(mocksDir, 'remark-gfm.ts'),
    },
    {
      find: '@epam/ai-dial-overlay',
      replacement: path.resolve(mocksDir, '@epam/ai-dial-overlay.ts'),
    },
    {
      find: 'jose',
      replacement: path.resolve(mocksDir, 'jose.ts'),
    },
  ];
}

/**
 * Common inline dependencies for Vitest server configuration
 */
export const commonInlineDeps = [
  /@frontend\//,
  /react-markdown/,
  /remark-gfm/,
  /@epam\/ai-dial-overlay/,
  /jose/,
  /monaco-editor/,
  /pixi\.js/,
];
