/* eslint-disable */
export default {
  displayName: 'common',
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
  coverageDirectory: '../../coverage/libs/common',
};
