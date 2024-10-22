/* eslint-disable */
export default {
  displayName: 'spreadsheet',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/spreadsheet',
  transformIgnorePatterns: [
    '/node_modules/(?!(@deltix)/)',
    '/node_modules/(?!react-markdown).+\\.js$',
    '/node_modules/(?!remark-gfm).+\\.js$',
  ],
};
