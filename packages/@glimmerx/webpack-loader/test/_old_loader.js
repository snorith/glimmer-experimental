const { preprocessEmbeddedTemplates } = require('babel-plugin-htmlbars-inline-precompile');

const { getOptions } = require('loader-utils');
const { validate } = require('schema-utils');

const getTemplateLocalsRequirePath = require.resolve('@glimmer/syntax');

const schema = {
  type: 'object',
  properties: {
    test: {
      type: 'string',
    },
  },
};

const TEMPLATE_TAG_CONFIG = {
  getTemplateLocalsRequirePath,
  getTemplateLocalsExportPath: 'getTemplateLocals',

  templateTag: 'template',
  templateTagReplacement: 'GLIMMER_TEMPLATE',

  includeSourceMaps: true,
  includeTemplateTokens: true,
};

const TEMPLATE_LITERAL_CONFIG = {
  getTemplateLocalsRequirePath,
  getTemplateLocalsExportPath: 'getTemplateLocals',

  importIdentifier: 'hbs',
  importPath: '@glimmerx/component',

  includeSourceMaps: true,
  includeTemplateTokens: true,
};

const SOURCE_MAP_URL_REGEX =
  /\n\/\/# sourceMappingURL=data:application\/json;charset=utf-8;base64,(.+)$/;

function extractSourceMap(output) {
  const match = output.match(SOURCE_MAP_URL_REGEX);
  if (!match) {
    return { code: output, map: null };
  }
  const code = output.slice(0, match.index);
  const map = JSON.parse(Buffer.from(match[1], 'base64').toString('utf-8'));
  return { code, map };
}

module.exports = function (source) {
  const options = getOptions(this);

  validate(schema, options, {
    name: 'Glimmer Embedded Template Loader',
    baseDataPath: 'options',
  });

  let filename = this._module.resource;
  let config;

  if (filename.match(/\.(js|ts)$/)) {
    config = TEMPLATE_LITERAL_CONFIG;
  } else if (filename.match(/\.(gjs|gts)$/)) {
    config = TEMPLATE_TAG_CONFIG;
  } else {
    return source;
  }

  let { output } = preprocessEmbeddedTemplates(
    source,
    Object.assign({ relativePath: filename }, config)
  );

  const { code, map } = extractSourceMap(output);
  this.callback(null, code, map);
};

module.exports.extractSourceMap = extractSourceMap;
