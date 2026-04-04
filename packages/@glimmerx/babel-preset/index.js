function defaultTo(value, defaultVal) {
  return value === undefined ? defaultVal : value;
}

module.exports = function (api, options) {
  let __loadPlugins = defaultTo(options.__loadPlugins, false);

  return {
    presets: [
      [
        __loadPlugins ? require('@norith/glimmer-babel-preset') : require.resolve('@norith/glimmer-babel-preset'),
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
