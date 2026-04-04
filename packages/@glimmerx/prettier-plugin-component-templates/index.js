const babelParsers = require('prettier/parser-babel').parsers;
const typescriptParsers = require('prettier/parser-typescript').parsers;

const {
  builders: { group, indent, softline, hardline },
  utils: { stripTrailingHardline, getDocParts },
} = require('prettier').doc;

function startsWithHardline(doc) {
  const [first, second] = getDocParts(doc.contents);
  return first && first.type === 'line' && first.hard && second && second.type === 'break-parent';
}

function formatHbs(path, print, textToDoc, options) {
  const node = path.getValue();
  const text = node.quasis.map((quasi) => quasi.value.raw).join('');

  const isMultiLine = text.startsWith('\n') || node.loc.end.column >= options.printWidth;

  let doc = stripTrailingHardline(
    textToDoc(text, {
      parser: 'glimmer',
      singleQuote: options.hbsSingleQuote,
    })
  );

  if (!isMultiLine) {
    return group(['`', doc, '`']);
  }

  if (startsWithHardline(doc)) {
    return group(['`', indent(group(doc)), softline, '`']);
  }

  return group(['`', indent([hardline, group(doc)]), softline, '`']);
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

// Store reference to built-in estree printer
let estreePrinter = null;

function getEstreePrinter(options) {
  if (!estreePrinter) {
    for (const plugin of options.plugins) {
      if (plugin.printers?.estree) {
        estreePrinter = plugin.printers.estree;
        break;
      }
    }
  }
  return estreePrinter;
}

function embed(path, print, textToDoc, options) {
  if (isHbs(path)) {
    const output = formatHbs(path, print, textToDoc, {
      ...options,
      singleQuote: options.hbsSingleQuote,
    });
    return output;
  }
  // Delegate to built-in estree embed
  const printer = getEstreePrinter(options);
  if (printer?.embed) {
    return printer.embed(path, print, textToDoc, options);
  }
  return undefined;
}

function print(path, options, print) {
  // Delegate to built-in estree print
  const printer = getEstreePrinter(options);
  if (printer?.print) {
    return printer.print(path, options, print);
  }
  throw new Error('Could not find estree printer');
}

const languages = [
  {
    name: 'glimmer-experimental',
    group: 'JavaScript',
    parsers: ['babel', 'babel-ts', 'typescript'],
    extensions: ['.gjs', '.js', '.ts'],
    vscodeLanguageIds: ['javascript'],
  },
];

const parsers = {
  babel: {
    ...babelParsers.babel,
    // Keep original astFormat
    parse(text, parsers, options) {
      const ast = babelParsers.babel.parse(text, parsers, options);
      return ast;
    },
  },
  typescript: {
    ...typescriptParsers.typescript,
    // Keep original astFormat
    parse(text, parsers, options) {
      const ast = typescriptParsers.typescript.parse(text, parsers, options);
      return ast;
    },
  },
};

const printers = {
  estree: {
    embed,
    print,
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
