# Next Steps — GlimmerX Fork Improvements

Potential improvements to the `@norith/glimmerx-*` and `@norith/glimmer-*` forked packages that would improve developer experience, reduce bugs, and modernize the framework.

---

## 1. ~~Eliminate Tree-Shaking Bare Reference Requirement~~ — Fixed via `preserveScopePlugin`

**Status:** Fixed. Consumer apps must add one top-level babel plugin. Bare reference statements are no longer needed.

### Real Root Cause (corrected 2026-04-09)

The earlier 2026-03-29 conclusion ("`scope()` already prevents tree-shaking") was wrong. It was tested on a JS-only file, not a TypeScript file. The real failure mode only triggers when `@babel/preset-typescript` is in the babel pipeline, which is the case in any consumer app using `babel-loader` for `.ts` files.

The chain is:

1. `@babel/preset-typescript`'s `Program.enter` visitor walks every top-level binding and calls `isImportTypeOnly(binding)`. That function iterates `binding.referencePaths` — if every reference is a TypeScript type position (or there are zero references), the import gets stripped.
2. Babel's scope tracker has no idea what's inside an `hbs` tagged template literal. It's a string. So an import like `PlainAwait` whose only "use" is `<PlainAwait />` inside `hbs\`...\`` has zero reference paths from babel's perspective. preset-typescript strips it.
3. By the time `babel-plugin-htmlbars-inline-precompile` reaches the `TaggedTemplateExpression` and calls `getScope(path.scope)`, the bindings are already gone. It passes an empty `locals` to the precompiler.
4. `@glimmer/compiler` precompiles the template in strict mode with no locals, reaches `<PlainAwait>`, and throws:
   > `Attempted to invoke a component that was not in scope in a strict mode template`

The bare reference statement (`PlainAwait;` on its own line) worked because it was a value reference babel could see, so preset-typescript's `isImportTypeOnly` returned `false` and the import survived.

### Why the Old `@glimmerx/babel-plugin-component-templates` Didn't Have This Bug

The old (now-removed) plugin had a `Program.enter` visitor that called `binding.reference(noopNode)` on every top-level binding before any other transform ran. From preset-typescript's perspective every binding then had ≥1 reference path that was *not* in a type position, so nothing got stripped. After template processing had injected real references via the scope expression, the phantom references were removed in `Program.exit`. The real ones (inside the compiled template's `scope: () => [...]` closure) carried the imports through tree-shaking.

`babel-plugin-htmlbars-inline-precompile` (the upstream replacement that the current pipeline uses) does *not* do this dance. That's the regression.

### The Fix

Ported the phantom-reference mechanism to a small standalone babel plugin: `packages/@glimmerx/babel-preset/preserve-scope-plugin.js` (~30 lines).

**Important constraint on placement:** This plugin must run *before* `@babel/preset-typescript`'s `Program.enter`. Babel's preset ordering rules — presets expand in *reverse* array order, and within a preset the preset's own plugins come before its nested presets' plugins — mean we cannot ship this plugin inside `@glimmerx/babel-preset` and have it work in the typical consumer config (where `@babel/preset-typescript` is listed last, i.e. expanded first). The plugin will always end up running *after* preset-typescript has already stripped imports.

So the plugin is exported but **must be added by the consumer as a top-level babel plugin**.

### Required Consumer Change

In the consumer's `.babelrc` / `.babelrc.js` / `babel.config.js`, add the plugin to the top-level `plugins` array:

```js
// .babelrc.js (or equivalent)
module.exports = {
  plugins: [
    require('@glimmerx/babel-preset/preserve-scope-plugin'),
    // ...any other plugins
  ],
  presets: [
    ['@babel/preset-env', { /* ... */ }],
    '@glimmerx/babel-preset',
    ['@babel/preset-typescript', { allowDeclareFields: true }],
  ],
};
```

Or, equivalently, via the named export:

```js
const { preserveScopePlugin } = require('@glimmerx/babel-preset');

module.exports = {
  plugins: [preserveScopePlugin /* , ... */],
  presets: [/* ... */],
};
```

After this change, consumer files can drop their bare reference statements:

```diff
  import Component, { hbs } from "@glimmerx/component";
  import PlainAwait from "components/PlainAwait";
  import { on } from "@glimmerx/modifier";

- // These bare references exist ONLY to prevent tree shaking
- PlainAwait
- on

  export default class Foo extends Component {
    static template = hbs`<PlainAwait /><button {{on 'click' this.go}}>Go</button>`;
  }
```

### Verification

End-to-end verified against the `fableandfolly_megatronweb/client` consumer babel config (`@babel/preset-env` + `@glimmerx/babel-preset` + `@babel/preset-typescript`). With the top-level plugin added, the file compiles cleanly and the output preserves both imports plus a `scope: () => [PlainAwait, on]` closure. Without the plugin, the same file throws the strict-mode-scope error.

A regression test fixture lives at `packages/@glimmerx/babel-preset/test/fixtures/preserve-scope-typescript/`. Note: the existing `mocha + esm` test runner has a pre-existing Node 22 incompatibility and currently can't load `test/index.js` — that's a separate cleanup task. The fixture has been verified manually by running babel against `code.ts` and comparing to `output.js`.

### Why Not Auto-Wire It Inside the Preset?

Babel plugin-ordering rules make this impossible without consumer-side changes:

- Top-level plugins run before all preset plugins.
- Presets expand in reverse array order; within each preset, the preset's own plugins run before its nested presets' plugins.
- In the consumer's config `presets: [preset-env, glimmerx, preset-typescript]`, preset-typescript expands first, so its `Program.enter` strips imports before `glimmerx`'s plugins (including any we'd nest here) get a chance to run.

The only ways to make the plugin run before preset-typescript are:
1. Add it as a top-level plugin (chosen — minimal one-line change).
2. Reorder the consumer's presets so `@glimmerx/babel-preset` is last (more invasive, changes existing semantics).
3. Fork or monkey-patch `@babel/plugin-transform-typescript` (too fragile).

---

## 2. Template Compilation Source Maps

**Impact:** Medium — significantly improves debugging experience
**Effort:** Medium-High
**Repos:** `snorith/glimmer-experimental` (webpack-loader, babel-preset)
**Status:** Partially complete — loader-to-babel handoff fixed, Babel plugin gap remains

### The Problem

When a template has an error — wrong argument type, missing component, malformed expression — the error points to the compiled JavaScript output, not the original `hbs` template string in the source file. Developers must mentally map between compiled code and their template to find the issue.

The tracking error improvements (v1.0.1) help with `@tracked` property errors specifically, but template compilation errors, runtime rendering errors, and Glint type errors in templates all still suffer from poor source mapping.

### What's Been Done

**Fixed: Webpack loader source map passthrough.** The loader was calling `return output` which discards the source map. Now it extracts the inline `sourceMappingURL` data URI from the `preprocessEmbeddedTemplates` output, decodes it, and passes it to webpack via `this.callback(null, code, map)`. This allows babel-loader (the next loader in the chain) to receive and chain its own source maps on top.

- Changed `packages/@glimmerx/webpack-loader/index.js` to use `this.callback()` instead of `return`
- Added `extractSourceMap()` helper to parse inline base64 source maps
- Added unit tests (3) and webpack integration test (1)

**Result:** Non-template code in compiled output now correctly maps back to original source files. The original source content (including `hbs` template text) is preserved in the source map's `sourcesContent`.

### Remaining Gap

The compiled **template wire format is unmapped**. When `babel-plugin-htmlbars-inline-precompile` replaces `hbs\`<h1>Hello</h1>\`` with `createTemplateFactory({ block: "[[[10,\"h1\"]...]]" })`, the generated Babel AST nodes have no `loc` data. Specifically:

- The `createTemplateFactory(...)` call maps to the wrong line (class closing brace instead of the `hbs` line)
- The compiled opcode string (`"block": "..."`) is completely unmapped
- The original `hbs` template line has zero reverse mappings — nothing in the output points back to it

### Potential Fix

Patch `babel-plugin-htmlbars-inline-precompile` (peer dep, `^5.2.1`) to preserve `loc` on the AST nodes it generates. When building the `createTemplateFactory(...)` replacement expression, copy the source location from the original `hbs` tagged template literal node. This would make Babel's source map generation correctly attribute the compiled output to the template source line.

This is in the peer dependency package, not in forked code. Options:
1. Fork `babel-plugin-htmlbars-inline-precompile` and patch it
2. Contribute the fix upstream to `ember-cli/babel-plugin-htmlbars-inline-precompile`
3. Add a post-transform Babel plugin that corrects `loc` on `createTemplateFactory` calls

### Key Files

- `snorith/glimmer-experimental: packages/@glimmerx/webpack-loader/index.js` — source map extraction and passthrough (DONE)
- `snorith/glimmer-experimental: packages/@glimmerx/webpack-loader/test/` — unit and integration tests (DONE)
- `babel-plugin-htmlbars-inline-precompile` (peer dep) — AST node `loc` preservation (TODO)

---

## 3. Plain Functions as Helpers (No `helper()` Wrapper)

**Impact:** Medium — ergonomic improvement, aligns with modern Ember/Glimmer patterns
**Effort:** Medium (bounded — infrastructure already exists)
**Repos:** `snorith/glimmer.js` (runtime resolution), `snorith/glimmer-experimental` (helper package)

### Background

In Ember 4.5+ ([RFC 756 - Default Helper Manager](https://github.com/emberjs/rfcs/blob/master/text/0756-helper-default-manager.md)), plain functions work as helpers without any wrapper. Currently GlimmerX uses `helper()` to wrap functions.

### Current State — It's More Nuanced Than Expected

GlimmerX already registers **both** a helper manager and a modifier manager on `Function.prototype` (in `@norith/glimmerx-core/index.ts`):

```javascript
setModifierManager(FUNCTIONAL_MODIFIER_MANAGER_FACTORY, Function.prototype);
setHelperManager(FUNCTIONAL_HELPER_MANAGER_FACTORY, Function.prototype);
```

This means **plain functions already work as both helpers and modifiers at runtime**. The Glimmer VM determines which manager to use based on **template position**:
- `{{myFn arg1}}` → helper position → uses `FunctionalHelperManager`
- `<div {{myFn arg1}}>` → modifier position → uses `FunctionalModifierManager`

The same function can be used as either. The VM resolves the correct manager from template context, not from the function itself.

### Why `helper()` Is Still Used

The `helper()` wrapper from `@norith/glimmerx-helper` is NOT redundant — it provides two things the `Function.prototype` registration does not:

1. **Service injection**: The `BasicHelperManager` in `helper()` creates an `ownerProxy` that provides `options.services` as the third argument. Helpers that need to access services (e.g., for API calls, shared state) require this wrapper. The `FunctionalHelperManager` on `Function.prototype` only passes positional args.

2. **Type branding for Glint**: `helper()` returns the function cast as `Helper<S>` — a branded type that Glint uses to distinguish typed helpers from plain functions in template type checking.

### What Could Be Improved

For helpers that **don't use services** (the majority — e.g., `eq`, `and`, `not`, `formatDate`), the `helper()` wrapper is unnecessary overhead. The improvement would be:

1. **Keep `helper()` for helpers that need service injection** — these genuinely need the `BasicHelperManager` with `ownerProxy`
2. **Allow plain functions for simple helpers** — update Glint types so plain functions are accepted as helpers in templates
3. **Update `@norith/glint-environment-glimmerx`** — the DSL type definitions need to accept `(...args) => T` as a valid helper type, not just `HelperLike` instances

### Helper vs Modifier Disambiguation

Since both managers are on `Function.prototype`, there is NO runtime ambiguity — the Glimmer VM uses template position to determine the manager:

| Template position | Example | Manager used |
|---|---|---|
| Content/expression | `{{myFn arg1}}` | `FunctionalHelperManager` (returns a value) |
| Element modifier | `<div {{myFn arg1}}>` | `FunctionalModifierManager` (receives element, returns optional destructor) |
| Component argument | `@onClick={{myFn}}` | Passed as-is (no manager — it's just a function reference) |

The function signature is different in practice:
- **Helper**: `(positional: any[]) => returnValue`
- **Modifier**: `(element: HTMLElement, ...args: any[]) => (() => void) | undefined`

But this is a convention, not enforced at runtime. A function could technically be used in both positions if its signature handles both cases.

### Migration Path

1. Update Glint types to accept plain functions as helpers
2. Audit `hbs_helpers.ts` — identify which of the 17 `helper()` calls use `options.services`
3. Remove `helper()` wrapper from those that don't use services
4. Keep `helper()` wrapper for those that do
5. Document the convention: use `helper()` only when service injection is needed

---

## 4. Lazy Page Loading via Webpack Code Splitting

**Impact:** High — reduces initial bundle size significantly
**Effort:** Low-Medium
**Repos:** Consumer webapp (no fork changes needed)

### The Problem

Every page in the webapp is eagerly imported in `main.ts`:

```typescript
import campaigns from "./pages/campaigns2/campaigns2";
import reportsBuilder from "./pages/reports-builder/index";
import missionControl from "pages/mission-control";
// ... 30+ more page imports
```

All pages are bundled into the main JavaScript payload, loaded on every page view regardless of which page the user actually visits. This increases initial load time and wastes bandwidth.

### Why This Is Feasible

The webapp's page initialization pattern already encapsulates everything needed to mount a page:

```typescript
// Each page's init function handles its own:
// 1. Element ID lookup
// 2. Service instantiation
// 3. renderComponent call with services and args
export default function campaigns2(): Promise<void> {
    const pageElement = document.getElementById("kt_app_content_container");
    const filterService = new CampaignFilterService();
    return renderComponent(Campaigns2Component, {
        element: pageElement,
        services: { filterService },
        args: {}
    });
}
```

Each page is self-contained — it knows its element ID, creates its own services, and mounts itself. The page functions are collected into a `PageFunctions` map in `main.ts` and dispatched by a server-rendered meta tag:

```typescript
const f = PageFunctions[AppEnvSettings.flightpathpage];
if (f) { f(); startup_services(); }
```

This dispatch pattern is the natural code-splitting boundary. The page function doesn't need to exist at import time — only when the meta tag triggers it.

### Implementation

Replace static imports with lazy wrappers that dynamically import the page module:

```typescript
// Before — eagerly loaded, in main bundle
import campaigns2 from "./pages/campaigns2/campaigns2";
import missionControl from "pages/mission-control";

// After — lazy loaded, separate webpack chunks
const campaigns2 = () => import(
    /* webpackChunkName: "page-campaigns2" */ "./pages/campaigns2/campaigns2"
).then(m => m.default());

const missionControl = () => import(
    /* webpackChunkName: "page-mission-control" */ "pages/mission-control"
).then(m => m.default());
```

Each page's init function continues to handle its own element ID, service creation, and mounting — the lazy wrapper just defers when the module is loaded.

For pages that vary in their export pattern (some export a class, some a function, some use jQuery), the wrapper adapts:

```typescript
// Page that exports a function (most common)
const campaigns2 = () => import(
    /* webpackChunkName: "page-campaigns2" */ "./pages/campaigns2/campaigns2"
).then(m => m.default());

// Page that uses jQuery wrapper internally
const missionControl = () => import(
    /* webpackChunkName: "page-mission-control" */ "pages/mission-control"
).then(m => m.default());
```

The `PageFunctions` map type stays the same — it's `Record<string, () => void | Promise<void>>` — since both sync and async functions are valid.

### Error Handling

Chunk loading can fail (network errors, cache issues). The wrapper should handle this:

```typescript
function lazyPage(loader: () => Promise<{ default: () => void | Promise<void> }>) {
    return async () => {
        try {
            const module = await loader();
            return module.default();
        } catch (err) {
            console.error('Failed to load page module:', err);
            // Show a user-friendly error in the page container
            const container = document.getElementById('kt_app_content_container');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-danger m-5">
                        Failed to load page. Please refresh your browser.
                    </div>
                `;
            }
        }
    };
}

// Usage
const campaigns2 = lazyPage(() => import(
    /* webpackChunkName: "page-campaigns2" */ "./pages/campaigns2/campaigns2"
));
```

### Incremental Adoption

This can be adopted page-by-page — no big-bang migration needed:

1. Start with the largest/least-visited pages (e.g., reports builder, mission control, site preferences)
2. Use `webpack-bundle-analyzer` (`yarn run build:analyze`) to identify the biggest chunks
3. Convert one page at a time by replacing `import X from "pages/..."` with the lazy wrapper
4. The page still works identically — the only difference is when the JavaScript loads

### What Doesn't Need to Change

- **No fork changes needed** — this is purely a consumer app concern
- **No template changes** — pages render the same way once loaded
- **No page init functions change** — each page still handles its own element ID, services, and mounting
- **No routing changes** — Navigo calls the same function signature
- **Components within a page stay eagerly loaded** relative to that page — only the page-level split matters

### Webpack Configuration

The existing `webpack.common.js` already has `splitChunks` configured with `chunks: 'all'`. Dynamic `import()` with `webpackChunkName` comments will automatically create named chunks. The `framework` and `lib` cache groups will continue to work for shared dependencies.

### Prerequisite: Remove jQuery `$()` Wrappers from Page Init Functions

Several older page init functions wrap their mounting code in `$(function() { ... })` (jQuery's `DOMContentLoaded` handler):

```typescript
// Older pattern — unnecessary jQuery DOMContentLoaded wrapper
export default function () {
  $(function () {
    const container = document.getElementById("mission-control-container");
    renderComponent(MissionControl, { element: container });
  });
}
```

This is unnecessary. By the time `main.ts` runs, the DOM is already loaded — the script tags are at the bottom of the page (or deferred), and the server-rendered meta tag that triggers page dispatch is already present. Newer pages like `campaigns2` don't use `$()` and work correctly.

The `$()` wrapper should be removed from all page init functions as a cleanup pass before adopting lazy loading. The jQuery wrapper adds an unnecessary async hop that complicates the promise chain — `lazyPage()` expects `module.default()` to return a `Promise<void>` from `renderComponent`, but `$()` returns `undefined` and defers the actual mounting to a separate microtask.

### Considerations

- **Preloading**: For known navigation paths, webpack's `/* webpackPrefetch: true */` magic comment can preload chunks during idle time
- **Error handling**: If chunk loading fails (network error), the async wrapper should show an error state rather than silently failing
- **Server-rendered page detection**: The webapp uses server-rendered meta tags to determine which page to load — the dynamic import wrapper needs to handle this same detection
