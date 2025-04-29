/* eslint-disable */
export default {
  displayName: 'canvasSpreadsheet',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
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
  coverageDirectory: '../../coverage/libs/canvasSpreadsheet',
  setupFilesAfterEnv: ['../../jest-canvas.js'],
};
