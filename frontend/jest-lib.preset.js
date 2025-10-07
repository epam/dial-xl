const nxPreset = require('@nx/jest/preset').default;
const { compilerOptions } = require('./tsconfig.base.json');
const { pathsToModuleNameMapper } = require('ts-jest');
const path = require('path');
const workspaceRoot = __dirname;

/**
 * This preset fixes running jest tests from inside any library folder.
 * It simply re-exports the main Nx preset while resolving everything from `__dirname`.
 */

const filteredPaths = Object.fromEntries(
  Object.entries(compilerOptions.paths ?? {}).filter(([key]) => key !== '*')
);

const aliasMapper = pathsToModuleNameMapper(filteredPaths, {
  prefix: workspaceRoot + path.sep,
});

module.exports = {
  ...nxPreset,
  moduleNameMapper: {
    ...nxPreset.moduleNameMapper,
    ...aliasMapper,
  },
};
