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

### The Problem

When a template has an error — wrong argument type, missing component, malformed expression — the error points to the compiled JavaScript output, not the original `hbs` template string in the source file. Developers must mentally map between compiled code and their template to find the issue.

The tracking error improvements (v1.0.1) help with `@tracked` property errors specifically, but template compilation errors, runtime rendering errors, and Glint type errors in templates all still suffer from poor source mapping.

### The Solution

The webpack-loader already passes `includeSourceMaps: true` to `preprocessEmbeddedTemplates`, but the source maps don't carry through the full compilation chain:

1. **Webpack loader** (`preprocessEmbeddedTemplates`) generates initial source maps for the template preprocessing step
2. **Babel** (`@glimmerx/babel-preset` → `@glimmer/babel-preset` → `babel-plugin-htmlbars-inline-precompile`) compiles the template to JavaScript — this step may not preserve or chain the source maps correctly
3. **Webpack** bundles the output — if input source maps are missing or broken, the final bundle maps are wrong

The fix involves ensuring source maps are correctly chained through each step:
- Verify the webpack-loader passes source maps to the next loader (babel-loader) via the standard Webpack `this.callback(null, code, sourceMap)` pattern
- Verify `babel-plugin-htmlbars-inline-precompile` preserves source maps during template compilation
- Test that the final Webpack output maps template errors back to the `hbs` tagged template literal

### Key Files

- `snorith/glimmer-experimental: packages/@glimmerx/webpack-loader/index.js` — source map generation
- `snorith/glimmer-experimental: packages/@glimmerx/babel-preset/index.js` — babel preset that wraps the compiler
- `snorith/glimmer.js: packages/@glimmer/babel-preset/index.js` — the actual compiler integration

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
