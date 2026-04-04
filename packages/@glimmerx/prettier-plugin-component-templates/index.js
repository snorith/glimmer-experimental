const babelParsers = require('prettier/plugins/babel').parsers;
const typescriptParsers = require('prettier/plugins/typescript').parsers;
const estreePrinter = require('prettier/plugins/estree').printers.estree;

const {
  builders: { group, indent, softline, hardline },
} = require('prettier').doc;

function normalizeDoc(doc) {
  if (Array.isArray(doc)) {
    return doc.map((item) => normalizeDoc(item));
  }

  if (!doc || typeof doc !== 'object') {
    return doc;
  }

  if (doc.type === 'concat' && Array.isArray(doc.parts)) {
    return doc.parts.map((item) => normalizeDoc(item));
  }

  const normalized = { ...doc };
  for (const key of ['contents', 'parts', 'breakContents', 'flatContents']) {
    if (key in normalized) {
      normalized[key] = normalizeDoc(normalized[key]);
    }
  }

  if (Array.isArray(normalized.expandedStates)) {
    normalized.expandedStates = normalized.expandedStates.map((item) => normalizeDoc(item));
  }

  return normalized;
}

function firstDocPart(doc) {
  if (Array.isArray(doc)) {
    for (const part of doc) {
      const first = firstDocPart(part);
      if (first !== undefined) {
        return first;
      }
    }

    return undefined;
  }

  if (doc === '' || doc === null || doc === undefined) {
    return undefined;
  }

  if (typeof doc === 'string') {
    return doc.length > 0 ? doc : undefined;
  }

  if (typeof doc !== 'object') {
    return doc;
  }

  if (doc.contents !== undefined) {
    return firstDocPart(doc.contents);
  }

  if (doc.parts !== undefined) {
    return firstDocPart(doc.parts);
  }

  return doc;
}

function startsWithHardline(doc) {
  const first = firstDocPart(doc);
  return first && typeof first === 'object' && first.type === 'line' && first.hard === true;
}

async function formatHbs(path, print, textToDoc, options) {
  const node = path.getValue();
  const text = node.quasis.map((quasi) => quasi.value.raw).join('');

  const isMultiLine = text.startsWith('\n') || node.loc.end.column >= options.printWidth;

  const templateDoc = normalizeDoc(
    await textToDoc(text, {
      parser: 'glimmer',
      singleQuote: options.hbsSingleQuote,
    })
  );

  if (!isMultiLine) {
    return group(['`', templateDoc, '`']);
  }

  if (startsWithHardline(templateDoc)) {
    return group(['`', indent(templateDoc), softline, '`']);
  }

  return group(['`', indent([hardline, templateDoc]), softline, '`']);
}

function isHbs(path) {
  return path.match(
    (node) => {
      return node.type === 'TemplateLiteral';
    },
    (node, name) => {
      return (
        node.type === 'TaggedTemplateExpression' &&
        node.tag.type === 'Identifier' &&
        node.tag.name === 'hbs' &&
        name === 'quasi'
      );
    }
  );
}

function embed(path, options) {
  if (!isHbs(path)) {
    return undefined;
  }

  return async (textToDoc, print) =>
    formatHbs(path, print, textToDoc, {
      ...options,
      singleQuote: options.hbsSingleQuote,
    });
}

const languages = [
  {
    name: 'glimmer-experimental',
    group: 'JavaScript',
    parsers: ['babel'],
    extensions: ['.gjs'],
    vscodeLanguageIds: ['javascript'],
  },
];

const parsers = {
  babel: {
    ...babelParsers.babel,
  },
  typescript: {
    ...typescriptParsers.typescript,
  },
};

const printers = {
  estree: {
    ...estreePrinter,
    embed,
  },
};

module.exports = {
  languages,
  parsers,
  printers,
  options: {
    hbsSingleQuote: {
      type: 'boolean',
      category: 'Global',
      default: false,
      description: 'Change quote preference in inline hbs files to single quote.',
    },
  },
};
