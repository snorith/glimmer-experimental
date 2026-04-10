// Reproduces the consumer pipeline that triggered the bug:
// @babel/preset-typescript strips PlainAwait/on (referenced only inside an
// `hbs` tagged template literal) before babel-plugin-htmlbars-inline-precompile
// can extract the template scope. The preserveScopePlugin top-level plugin
// fixes this by phantom-referencing every top-level binding through the pass.
const path = require('path');

module.exports = {
  plugins: [
    require(path.resolve(__dirname, '../../../preserve-scope-plugin')),
  ],
  presets: [
    ['@glimmerx/babel-preset', { isDebug: false }],
    ['@babel/preset-typescript', { allowDeclareFields: true }],
  ],
};
