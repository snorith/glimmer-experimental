const { getTemplateLocals } = require('@glimmer/syntax');

const GLIMMERX_IMPORTS = [
  '@glimmerx/component',
  '@norith/glimmerx-component',
  '@glimmerx/core',
  '@norith/glimmerx-core',
];

module.exports = {
  docs: {
    description:
      'Components / Helpers referenced in hbs template literals should not trigger no-unused-vars failures, but should trigger no-undef if they are not defined properly',
    category: 'Variables',
    recommended: true,
  },
  meta: {
    messages: {
      undefToken: 'Token {{ token }} is used in an hbs tagged template literal, but is not defined',
    },
    schema: [
      {
        enum: ['unused-only', 'all'],
        default: 'all',
      },
      {
        type: 'object',
        properties: {
          nativeTokens: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const [mode = 'all', configOpts] = context.options;
    const nativeTokens = (configOpts && configOpts.nativeTokens) || [];

    function isHbs(node) {
      if (node.type !== 'TaggedTemplateExpression') return false;

      // Handle direct hbs`...`
      if (node.tag.type === 'Identifier') {
        const variable =
          context.getScope().set.get(node.tag.name) ||
          context.getScope().through.find((ref) => ref.identifier.name === node.tag.name)?.resolved;

        if (variable) {
          return variable.defs.some((def) => {
            if (def.type === 'ImportBinding') {
              const importDeclaration = def.parent;
              return (
                GLIMMERX_IMPORTS.includes(importDeclaration.source.value) &&
                def.node.imported &&
                def.node.imported.name === 'hbs'
              );
            }
            return false;
          });
        }
      }

      // Handle namespaces (e.g. gmx.hbs`...`)
      if (node.tag.type === 'MemberExpression' && node.tag.property.name === 'hbs') {
        const objectName = node.tag.object.name;
        const variable =
          context.getScope().set.get(objectName) ||
          context.getScope().through.find((ref) => ref.identifier.name === objectName)?.resolved;

        if (variable) {
          return variable.defs.some((def) => {
            if (def.type === 'ImportBinding') {
              const importDeclaration = def.parent;
              return (
                GLIMMERX_IMPORTS.includes(importDeclaration.source.value) &&
                (def.node.type === 'ImportNamespaceSpecifier' ||
                  def.node.type === 'ImportDefaultSpecifier')
              );
            }
            return false;
          });
        }
      }

      return false;
    }

    return {
      TaggedTemplateExpression(node) {
        if (!isHbs(node)) {
          return;
        }

        const templateElementNode = node.quasi.quasis[0];
        const templateString = templateElementNode.value.raw;

        const templateScopeTokens = getTemplateLocals(templateString);
        templateScopeTokens.forEach((token) => {
          const isTokenPresent = context.markVariableAsUsed(token);
          if (!isTokenPresent && !nativeTokens.includes(token) && mode === 'all') {
            context.report({
              data: {
                token,
              },
              messageId: 'undefToken',
              node: templateElementNode,
            });
          }
        });
      },
    };
  },
};
