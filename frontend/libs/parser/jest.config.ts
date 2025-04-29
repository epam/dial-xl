/* eslint-disable */
export default {
  displayName: 'parser',
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
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/libs/parser',
};
