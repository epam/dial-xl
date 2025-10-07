export default {
  displayName: '@quantgrid/quantgrid',
  preset: '../../jest-lib.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': [
      'babel-jest',
      {
        presets: ['@nx/react/babel'],
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: 'test-output/jest/coverage',
  moduleNameMapper: {
    '^react-markdown$': '<rootDir>/__mocks__/react-markdown.tsx',
    '^remark-gfm$': '<rootDir>/__mocks__/remark-gfm.ts',
    '^@epam/ai-dial-overlay$': '<rootDir>/__mocks__/@epam/ai-dial-overlay.ts',
    '^monaco-editor(/.*)?$': '<rootDir>/__mocks__/monaco-editor.ts',
    '^jose$': '<rootDir>/__mocks__/jose.ts',
  },
  setupFilesAfterEnv: ['../../jest-canvas.js'],
  testPathIgnorePatterns: ['apps/quantgrid/playwright/'],
};
