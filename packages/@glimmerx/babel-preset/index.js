function defaultTo(value, defaultVal) {
  return value === undefined ? defaultVal : value;
}

// The preserve-scope plugin MUST be added as a top-level plugin in the
// consumer's babel config, not inside this preset. See
// ./preserve-scope-plugin.js for the reason. We cannot wire it in here
// because presets expand in reverse array order — any plugin inside this
// preset would run AFTER @babel/preset-typescript's import stripper, which
// is too late to prevent template-only imports from being removed.
//
// Consumers must add it like so:
//
//   plugins: [
//     require('@glimmerx/babel-preset/preserve-scope-plugin'),
//     // ...their other plugins
//   ],

module.exports = function (api, options) {
  let __loadPlugins = defaultTo(options.__loadPlugins, false);

  return {
    presets: [
      [
        __loadPlugins
          ? require('@norith/glimmer-babel-preset')
          : require.resolve('@norith/glimmer-babel-preset'),
        {
          ...options,
          __customInlineTemplateModules: {
            // Support both the original and renamed import paths
            // (consumer apps may use npm aliases to keep '@glimmerx/component')
            '@glimmerx/component': {
              export: 'hbs',
              useTemplateLiteralProposalSemantics: 1,
            },
            '@norith/glimmerx-component': {
              export: 'hbs',
              useTemplateLiteralProposalSemantics: 1,
            },
            '@glimmerx/core': {
              export: 'hbs',
              useTemplateLiteralProposalSemantics: 1,
            },
            '@norith/glimmerx-core': {
              export: 'hbs',
              useTemplateLiteralProposalSemantics: 1,
            },

            'TEMPLATE-TAG-MODULE': {
              export: 'GLIMMER_TEMPLATE',
              debugName: '<template>',
              useTemplateTagProposalSemantics: 1,
            },
          },
        },
      ],
    ],
  };
};

// Named re-export so consumers can do:
//   const { preserveScopePlugin } = require('@glimmerx/babel-preset');
// as an alternative to:
//   require('@glimmerx/babel-preset/preserve-scope-plugin')
module.exports.preserveScopePlugin = require('./preserve-scope-plugin');
