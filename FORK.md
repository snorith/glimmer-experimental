# @norith/glimmerx-* — Maintained Fork of GlimmerX

## Why This Fork Exists

The upstream `@glimmerx/*` packages ([glimmerjs/glimmer-experimental](https://github.com/glimmerjs/glimmer-experimental)) are effectively abandoned — no releases since 2021, no active maintenance. This fork exists for projects that depend on GlimmerX as their frontend framework and are not migrating to Ember.js in the near future.

This fork exists to:

1. **Preserve the source** against upstream removal
2. **Improve debugging** — tracking errors currently surface with no component or property context
3. **Maintain compatibility** with evolving tooling (Node.js, TypeScript, Webpack versions)
4. **Publish under `@norith/*` scope** on npmjs.com so the team controls the supply chain

## What Changed From Upstream

### Package Renaming

All packages renamed from `@glimmerx/*` to `@norith/glimmerx-*`:

| Upstream | Fork |
|---|---|
| `@glimmerx/component` | `@norith/glimmerx-component` |
| `@glimmerx/core` | `@norith/glimmerx-core` |
| `@glimmerx/helper` | `@norith/glimmerx-helper` |
| `@glimmerx/modifier` | `@norith/glimmerx-modifier` |
| `@glimmerx/service` | `@norith/glimmerx-service` |
| `@glimmerx/babel-preset` | `@norith/glimmerx-babel-preset` |
| `@glimmerx/eslint-plugin` | `@norith/glimmerx-eslint-plugin` |
| `@glimmerx/webpack-loader` | `@norith/glimmerx-webpack-loader` |
| `@glimmerx/compiler` | `@norith/glimmerx-compiler` |

Consumer apps use **npm aliases** to avoid changing import paths in source code:

```json
"@glimmerx/component": "npm:@norith/glimmerx-component@^1.0.0"
```

This means `import Component from '@glimmerx/component'` continues to work unchanged.

### Backward Compatibility

The babel-preset, eslint-plugin, and webpack-loader all support **both** `@glimmerx/*` and `@norith/glimmerx-*` import paths. This ensures consumer apps using npm aliases work correctly.

### Versioning

All packages start at **1.0.0** — a clean break from the upstream 0.6.8.

## Dependency Landscape

This is critical context for anyone working on this fork.

### Frozen Runtime Dependencies (No Newer Versions Exist)

These packages are from the Glimmer.js 2.0 beta line and were abandoned alongside GlimmerX. **There will never be newer versions.**

| Package | Pinned Version | Used By |
|---|---|---|
| `@glimmer/core` | 2.0.0-beta.21 | `@norith/glimmerx-core` |
| `@glimmer/component` | 2.0.0-beta.21 | `@norith/glimmerx-component` |
| `@glimmer/tracking` | 2.0.0-beta.21 | `@norith/glimmerx-component` |
| `@glimmer/helper` | 2.0.0-beta.21 | `@norith/glimmerx-helper` |
| `@glimmer/modifier` | 2.0.0-beta.21 | `@norith/glimmerx-modifier` |
| `@glimmer/debug` | 2.0.0-beta.21 | `@norith/glimmerx-service` |
| `@glimmer/babel-preset` | 2.0.0-beta.21 | `@norith/glimmerx-babel-preset` |

### Pinned Compiler/Runtime-Coupled Dependencies

These packages ARE actively maintained (by the Ember/Glimmer VM team), but upgrading them is **dangerous** because they generate opcodes and types consumed by the frozen beta.21 runtime. An opcode format mismatch would cause silent runtime failures.

| Package | Pinned Version | Latest Available | Risk of Upgrading |
|---|---|---|---|
| `@glimmer/compiler` | 0.84.0 | 0.94.11 | High — generates opcodes for the runtime |
| `@glimmer/interfaces` | 0.84.0 | 0.94.6 | High — shared types between compiler and runtime |
| `@glimmer/manager` | 0.84.0 | 0.94.10 | High — manager APIs consumed by the runtime |

### Safely Upgraded Dependencies

These packages are used for **tooling only** (template parsing, analysis) — not runtime execution. Their APIs are stable across versions.

| Package | Previous | Current | Used For |
|---|---|---|---|
| `@glimmer/syntax` | 0.84.0 | ^0.92.0 | `getTemplateLocals` in webpack-loader and eslint-plugin |
| `@glimmer/owner` | 0.85.13 | ^0.93.4 | Direct webapp dependency (not in this fork) |

### Not Forked (Actively Maintained)

These packages are from the `glimmer-vm` repo and continue to receive releases as part of the Ember.js ecosystem. They do NOT need to be forked.

- `@glimmer/syntax`
- `@glimmer/owner`
- `@glimmer/env`
- `@glimmer/babel-plugin-glimmer-env`
- `babel-plugin-htmlbars-inline-precompile`

## Removed Upstream Package

`@glimmerx/babel-plugin-component-templates` was removed in the upstream 0.6.8 release and replaced by `@glimmerx/babel-preset` + `babel-plugin-htmlbars-inline-precompile`. If the consumer app still lists it as a dependency, it is vestigial and can be removed.

## Related Fork

The Glint type-checking packages are forked separately:

- **Repo:** [snorith/glint](https://github.com/snorith/glint) (fork of `typed-ember/glint`)
- **Published packages:** `@norith/glint-core`, `@norith/glint-environment-glimmerx`, `@norith/glint-scripts`, `@norith/glint-template`
- **Reason:** `@glint/environment-glimmerx` is at risk as the Glint project focuses on Ember Octane/Polaris

## Planned Improvements

### Tracking Error Debugging (Phase 1d — On Hold)

The primary debugging pain point: `@tracked` property assertion errors surface with generic messages and no component or property context.

Planned changes:
- Patch the `@tracked` decorator in `@norith/glimmerx-component` to attach `debugKey` labels (format: `ClassName#propertyName`) via `@glimmer/validator`'s tag debug API
- Enrich the render/revalidation loop in `@norith/glimmerx-core` to catch tracking assertion errors and re-throw with the component name appended
- Dev-mode only (`NODE_ENV !== 'production'`) — zero production overhead

## Publishing

Packages are published to npmjs.com under the `@norith` scope using **Trusted Publishing** (OIDC) via GitHub Actions — no long-lived tokens.

### Manual Release Process

1. Run the `publish.yml` workflow via GitHub Actions `workflow_dispatch`
2. Select release type: `major`, `minor`, or `patch`
3. The workflow bumps all package versions in lockstep, commits, tags, and publishes

### First-Time Setup (Already Done)

Each package was manually published once with `npm publish --access public`, then Trusted Publishing was configured on npmjs.com pointing to this repo's `publish.yml` workflow.

## Repository Structure

```
packages/
  @glimmerx/              # Directory names kept as @glimmerx for minimal diff
    babel-preset/         # @norith/glimmerx-babel-preset
    blueprint/            # @norith/glimmerx-blueprint
    compiler/             # @norith/glimmerx-compiler
    component/            # @norith/glimmerx-component
    core/                 # @norith/glimmerx-core
    eslint-plugin/        # @norith/glimmerx-eslint-plugin
    helper/               # @norith/glimmerx-helper
    modifier/             # @norith/glimmerx-modifier
    service/              # @norith/glimmerx-service
    webpack-loader/       # @norith/glimmerx-webpack-loader
    ...
  examples/               # Example apps (not published)
```

Note: Physical directory names remain `@glimmerx/*` to minimize diff from upstream. Package names in `package.json` are `@norith/glimmerx-*`.
