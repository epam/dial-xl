export default {
  displayName: '@quantgrid/canvasSpreadsheet',
  preset: '../../jest-lib.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: 'test-output/jest/coverage',
  setupFilesAfterEnv: ['../../jest-canvas.js'],
  moduleNameMapper: {
    '^monaco-editor$':
      '<rootDir>/../../apps/quantgrid/__mocks__/monaco-editor.ts',
    '^monaco-editor/.*$':
      '<rootDir>/../../apps/quantgrid/__mocks__/monaco-editor.ts',
    '^react-markdown$':
      '<rootDir>/../../apps/quantgrid/__mocks__/react-markdown.tsx',
    '^remark-gfm$': '<rootDir>/../../apps/quantgrid/__mocks__/remark-gfm.ts',
    '^@epam/ai-dial-overlay$':
      '<rootDir>/../../apps/quantgrid/__mocks__/@epam/ai-dial-overlay.ts',
  },
};
