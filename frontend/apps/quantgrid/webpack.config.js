const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), withReact(), (config) => {
  // Update the webpack config as needed here.
  // e.g. `config.plugins.push(new MyPlugin())`

  // There are a lot of source map warnings in the console from the 'inversify' package
  // This is a workaround to ignore them, can be removed when the package is updated
  config.ignoreWarnings = [/Failed to parse source map/];

  config.plugins.push(
    new MonacoWebpackPlugin({
      languages: [],
    })
  );

  config.plugins.push(
    new CopyWebpackPlugin({
      patterns: [{ from: path.resolve(__dirname, 'external-env.js') }],
    })
  );

  config.resolve.fallback = {
    util: require.resolve('url'),
    assert: require.resolve('assert'),
  };

  return config;
});
