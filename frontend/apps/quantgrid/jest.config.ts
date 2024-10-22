/* eslint-disable */
export default {
  displayName: 'quantgrid',
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.(ts|tsx)?$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.spec.json' },
    ],
    '^.+\\.(js|jsx)$': [
      'babel-jest',
      {
        presets: ['@nx/react/babel'],
        plugins: [
          ['@babel/plugin-proposal-private-methods', { loose: true }],
          '@babel/plugin-transform-class-static-block',
        ],
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/apps/quantgrid',
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!(@deltix)/).*/',
    '<rootDir>/node_modules/(?!monaco-editor).+\\.js$',
  ],
  testPathIgnorePatterns: ['apps/quantgrid/playwright/'],
  setupFilesAfterEnv: ['../../jest-canvas.js'],
};
