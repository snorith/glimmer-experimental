# CLAUDE.md — snorith/glimmer-experimental

## What This Repo Is

Maintained fork of [glimmerjs/glimmer-experimental](https://github.com/glimmerjs/glimmer-experimental) — the `@glimmerx/*` packages that provide a standalone GlimmerX component framework. Upstream is abandoned (no releases since 2021).

These packages are **thin wrappers** that re-export from the `@norith/glimmer-*` runtime packages. All packages are renamed from `@glimmerx/*` to `@norith/glimmerx-*` and published on npmjs.com under the `@norith` scope.

## Relationship to Other Forks

```
Consumer App
  └── @norith/glimmerx-*  (THIS REPO)                     ← thin wrappers
        └── @norith/glimmer-*  (snorith/glimmer.js)        ← actual runtime
              └── @glimmer/* 0.84.0  (glimmer-vm)           ← actively maintained, NOT forked
  └── @norith/glint-*     (snorith/glint)                   ← template type checking
```

- THIS repo depends on **snorith/glimmer.js** for runtime packages (`@norith/glimmer-*` as `^` range dependencies)
- THIS repo is consumed by consumer apps via npm aliases
- **snorith/glint** is independent (provides type checking)

## Packages

| Package | Description | Published |
|---|---|---|
| `@norith/glimmerx-component` | Re-exports `@norith/glimmer-component` + `@norith/glimmer-tracking` | Yes |
| `@norith/glimmerx-core` | Re-exports `@norith/glimmer-core` (renderComponent, etc.) | Yes |
| `@norith/glimmerx-helper` | Re-exports `@norith/glimmer-helper` | Yes |
| `@norith/glimmerx-modifier` | Re-exports `@norith/glimmer-modifier` (on, action) | Yes |
| `@norith/glimmerx-service` | Service injection decorator | Yes |
| `@norith/glimmerx-babel-preset` | Wraps `@norith/glimmer-babel-preset` with GlimmerX-specific template modules | Yes |
| `@norith/glimmerx-webpack-loader` | Webpack loader for GlimmerX templates | Yes |
| `@norith/glimmerx-eslint-plugin` | ESLint plugin for template variable checking | Yes |
| `@norith/glimmerx-compiler` | Re-exports `@glimmer/compiler` (from glimmer-vm, not forked) | Yes |

Additional packages exist (blueprint, prettier-plugin, storybook, ssr) but are not typically needed by consumer apps.

## Important: Backward Compatibility for Consumer Apps

Consumer apps use **npm aliases** so their source code doesn't change:
```json
"@glimmerx/component": "npm:@norith/glimmerx-component@^1.0.4"
```

The babel-preset, eslint-plugin, and webpack-loader all support **both** `@glimmerx/*` and `@norith/glimmerx-*` import paths to ensure this works.

When modifying these files, preserve BOTH old and new path support:
- `packages/@glimmerx/babel-preset/index.js` — `__customInlineTemplateModules` has entries for both `@glimmerx/component` and `@norith/glimmerx-component`
- `packages/@glimmerx/eslint-plugin/lib/rules/template-vars.js` — checks for both import sources
- `packages/@glimmerx/webpack-loader/index.js` — `importPath` stays as `@glimmerx/component` (matches consumer source code)

## Important: Dependency Version Management

- `@norith/glimmerx-*` cross-references (internal to this repo) are pinned to exact versions and bumped automatically by `scripts/bump-version.js`
- `@norith/glimmer-*` dependencies (from snorith/glimmer.js) use `^` caret ranges (e.g., `^1.0.1`) and are **NOT** auto-bumped — update manually when a new minimum version is needed
- `@glimmer/*` dependencies (from glimmer-vm) are pinned to `0.84.0` and should not be changed

## Build

```bash
# Requires Node 20 (managed via mise — see .mise.toml)
yarn install
yarn build                   # Compiles TS + builds storybook
```

TypeScript upgraded from 4.2 to 5.2 for compatibility with newer `@types/*` packages.

## Key Source Locations

- **Babel preset (template module mapping)**: `packages/@glimmerx/babel-preset/index.js`
- **Webpack loader (template preprocessing)**: `packages/@glimmerx/webpack-loader/index.js`
- **ESLint plugin (template var checking)**: `packages/@glimmerx/eslint-plugin/lib/rules/template-vars.js`
- **Service decorator**: `packages/@glimmerx/service/src/decorator.ts`

## Vestigial Package Note

Consumer apps may still list `@glimmerx/babel-plugin-component-templates` — this package was **removed** in the upstream 0.6.8 release and replaced by `@glimmerx/babel-preset` + `babel-plugin-htmlbars-inline-precompile`. It is not in this repo and should be removed from consumer `package.json`.

## Publishing

Manual `workflow_dispatch` via `.github/workflows/publish.yml` — select Major/Minor/Patch. Uses `scripts/bump-version.js` and `scripts/publish-packages.js`. Publish workflow upgrades npm to 11.5.1+ for Trusted Publishing OIDC.

## Accounts

- GitHub: `snorith`
- npmjs.com: `norith` (scope: `@norith`)
