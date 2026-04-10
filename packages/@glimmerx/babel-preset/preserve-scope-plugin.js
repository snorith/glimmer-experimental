// Preserves top-level bindings through the babel pass so that other transforms
// (notably @babel/preset-typescript's unused-import stripper) do not remove
// imports that are referenced only from inside an `hbs` tagged template string.
//
// Babel's scope tracker cannot see identifiers inside template literal strings,
// so a bare `import X from './X'` whose only use is `hbs\`<X />\`` looks
// unused to preset-typescript and gets stripped. By the time
// babel-plugin-htmlbars-inline-precompile walks the template and calls
// getScope(path.scope), the binding is already gone — the template compiles
// with no locals and fails with `not in scope in a strict mode template`.
//
// This plugin runs first in the pass. On Program.enter it calls
// binding.reference(noop) for every top-level binding, which bumps each
// binding's reference count to >= 1 from preset-typescript's perspective, so
// preset-typescript leaves the imports alone. By the time
// babel-plugin-htmlbars-inline-precompile visits the `hbs` tag and emits the
// scope closure (`scope: () => [X, Y]`), it sees the bindings intact and
// references them for real inside the closure. On Program.exit we remove the
// phantom references and the noop placeholder — the real references inside
// the scope closure remain and carry the imports through tree-shaking.
//
// Ported from the removed @glimmerx/babel-plugin-component-templates (which
// used the same mechanism until the upstream consolidation around
// babel-plugin-htmlbars-inline-precompile dropped it).

module.exports = function preserveScopePlugin({ types: t }) {
  return {
    name: '@norith/glimmerx-babel-preset/preserve-scope',
    visitor: {
      Program: {
        enter(path, state) {
          const parentScope = path.scope.getProgramParent();

          // Skip TS type-only bindings — we don't need to keep those alive and
          // marking them would interfere with preset-typescript's type-only
          // import handling.
          const bindings = Object.values(parentScope.bindings).filter(
            (b) => !b.referencePaths.some((p) => p.parent && p.parent.type === 'TSTypeReference')
          );

          if (bindings.length === 0) return;

          // Insert a noop at the top of the program to anchor the phantom refs.
          let firstNode = path.get('body.0');
          firstNode.insertBefore(t.noop());
          firstNode = path.get('body.0');

          bindings.forEach((b) => b.reference(firstNode));

          state.originalBindings = bindings;
          state.emptyPath = firstNode;
        },

        exit(path, state) {
          if (state.originalBindings) {
            state.originalBindings.forEach((b) => b.dereference(state.emptyPath));
            state.emptyPath.remove();
          }
        },
      },
    },
  };
};
