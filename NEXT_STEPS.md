# Next Steps — GlimmerX Fork Improvements

Potential improvements to the `@norith/glimmerx-*` and `@norith/glimmer-*` forked packages that would improve developer experience, reduce bugs, and modernize the framework.

---

## 1. Eliminate Tree-Shaking Bare Reference Requirement

**Impact:** High — touches every component file, prevents the most common class of runtime bugs
**Effort:** Medium
**Repos:** `snorith/glimmer-experimental` (webpack-loader)

### The Problem

Every component file requires bare reference statements to prevent Webpack from tree-shaking imports that are only referenced in `hbs` templates:

```typescript
import Component, { hbs } from "@glimmerx/component";
import PlainAwait from "components/PlainAwait";
import Input from "components/Input";
import { callFn, eq } from "libs/hbs_helpers";
import { on } from "@glimmerx/modifier";

// These bare references exist ONLY to prevent tree shaking
PlainAwait
Input
callFn
eq
on
```

If a developer forgets a reference, the component silently fails at runtime — no build error, no warning. This is the most common source of "component not rendering" bugs.

### The Solution

The `@norith/glimmerx-webpack-loader` already calls `getTemplateLocals()` from `@glimmer/syntax` to extract all free variables from templates. It passes these as a `scope()` function in its output. The loader can be enhanced to also emit anti-tree-shaking side effects for each scope variable.

**Current loader output:**
```javascript
// Template preprocessed, but scope vars can still be tree-shaken
```

**Enhanced loader output:**
```javascript
// Auto-generated: preserve scope variables referenced in template
/* @__SIDE_EFFECTS__ */ PlainAwait;
/* @__SIDE_EFFECTS__ */ Input;
/* @__SIDE_EFFECTS__ */ callFn;
```

Or alternatively, use Webpack's `sideEffects` configuration or a custom Webpack plugin that marks template-referenced imports as having side effects.

### Key Files

- `snorith/glimmer-experimental: packages/@glimmerx/webpack-loader/index.js` — the loader that processes templates
- The `TEMPLATE_LITERAL_CONFIG` and `TEMPLATE_TAG_CONFIG` objects configure `preprocessEmbeddedTemplates`
- `getTemplateLocals()` from `@glimmer/syntax` already extracts the variable names

### Verification

After implementation, systematically remove all bare reference statements from a test component and verify it still renders correctly. Then apply across the codebase.

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
