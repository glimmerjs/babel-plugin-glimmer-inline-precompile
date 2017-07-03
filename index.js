'use strict';

const _precompile = require('@glimmer/compiler').precompile;

module.exports = function(babel) {
  let t = babel.types;

  return {
    name: 'glimmer-inline-precompile',

    visitor: {
      ImportDeclaration(path, state) {
        let node = path.node;

        let matchingImportPath = state.opts.importPath || 'glimmer-inline-precompile';
        if (t.isLiteral(node.source, { value: matchingImportPath })) {
          let first = node.specifiers && node.specifiers[0];

          state.importId = state.importId || path.scope.generateUidIdentifierBasedOnNode(path.node.id);
          path.scope.rename(first.local.name, state.importId.name);
          path.remove();
        }
      },

      TaggedTemplateExpression(path, state) {
        if (!state.importId) { return; }

        let tagPath = path.get('tag');
        if (tagPath.node.name !== state.importId.name) {
          return;
        }

        if (path.node.quasi.expressions.length) {
          throw path.buildCodeFrameError('placeholders inside a tagged template string are not supported');
        }

        let precompile = state.opts.precompile || _precompile;
        let template = path.node.quasi.quasis.map(quasi => quasi.value.cooked).join('');
        let precompiled = precompile(template, { meta: { moduleName: state.file.opts.filename } });

        path.replaceWithSourceString(precompiled);
      },
    },
  };
};


module.exports.baseDir = () => __dirname;
