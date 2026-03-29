# Contributing to the @norith GlimmerX Fork

This document covers all three forked repositories and how they work together.

## The Three Repos

| Repo | What it contains | npm scope | Current version |
|---|---|---|---|
| [snorith/glimmer.js](https://github.com/snorith/glimmer.js) | Runtime packages — components, tracking, rendering | `@norith/glimmer-*` | 1.0.1 |
| [snorith/glimmer-experimental](https://github.com/snorith/glimmer-experimental) | Thin wrappers — the `@glimmerx/*` API surface | `@norith/glimmerx-*` | 1.0.4 |
| [snorith/glint](https://github.com/snorith/glint) | Template type checking — Glint with GlimmerX support | `@norith/glint-*` | 1.0.1 |

## Dependency Chain

```
Consumer App
  ├── @glimmerx/*  (npm aliases → @norith/glimmerx-*)   [glimmer-experimental]
  │     └── @norith/glimmer-*                             [glimmer.js]
  │           └── @glimmer/* 0.84.0                       [glimmer-vm, NOT forked]
  ├── @norith/glint-*  (direct, no aliases)               [glint]
  │     └── @glimmer/syntax                               [glimmer-vm, NOT forked]
  └── @glimmer/owner, @glimmer/env, etc.                  [glimmer-vm, NOT forked]
```

**Publish order matters:** glimmer.js first → glimmer-experimental second → glint (independent)

## Local Development Setup

All three repos should be cloned as siblings:

```bash
cd ~/WebstormProjects
git clone https://github.com/snorith/glimmer.js.git
git clone https://github.com/snorith/glimmer-experimental.git
git clone https://github.com/snorith/glint.git
```

Each repo uses **mise** for Node version management (`.mise.toml` pins Node 20) and **Yarn 1** (Classic) for package management.

### Building

```bash
# glimmer.js — uses lockfile
cd glimmer.js && yarn install && yarn build

# glimmer-experimental — uses lockfile
cd glimmer-experimental && yarn install && yarn build

# glint — uses lockfile, needs --force for clean builds
cd glint && yarn install && npx tsc --build --force
```

### Branching

All repos use gitflow: `main` (stable) + `develop` (working branch). Feature branches from `develop`.

## Making Changes

### 1. Identify which repo to change

| Change type | Repo |
|---|---|
| Runtime behavior (tracking, rendering, components) | `snorith/glimmer.js` |
| GlimmerX API surface (imports, decorators, services) | `snorith/glimmer-experimental` |
| Babel/webpack build tooling | `snorith/glimmer-experimental` |
| Template type checking | `snorith/glint` |

### 2. Make the change on `develop`

```bash
git checkout develop
# make changes
git add -A && git commit -m "Description of change"
```

### 3. Bump the version

Each repo has `scripts/bump-version.js`:

```bash
node scripts/bump-version.js patch   # 1.0.1 → 1.0.2
node scripts/bump-version.js minor   # 1.0.1 → 1.1.0
node scripts/bump-version.js major   # 1.0.1 → 2.0.0
```

This updates `package.json` version in all workspace packages and internal cross-references.

**Note for glimmer-experimental:** The bump script updates `@norith/glimmerx-*` cross-references but does NOT update `@norith/glimmer-*` dependencies (those are `^` ranges from a different repo). Update those manually if a new minimum version is needed.

### 4. Commit the version bump and tag

```bash
git add -A
git commit -m "Release vX.Y.Z"
git tag vX.Y.Z
git push origin develop
git push origin vX.Y.Z
```

### 5. Build and publish

```bash
yarn install && yarn build   # or: npx tsc --build --force (for glint)
node scripts/publish-packages.js
```

For local publishing, set up `~/.npmrc` with your token:
```
//registry.npmjs.org/:_authToken=<your-npm-token>
```

Remove it after publishing.

### 6. CI-based publishing (preferred)

Each repo has a `workflow_dispatch` publish workflow at `.github/workflows/publish.yml`:

1. Go to the repo on GitHub → Actions → "Publish Packages"
2. Click "Run workflow"
3. Select release type: `patch`, `minor`, or `major`
4. The workflow bumps versions, commits, tags, builds, and publishes

The workflows use **Trusted Publishing (OIDC)** — no npm token needed in CI. They upgrade npm to 11.5.1+ before publishing for OIDC support.

## Updating the Consumer App

After publishing new versions:

### For glimmerx package updates

Update version ranges in `client/package.json`:
```json
"@glimmerx/component": "npm:@norith/glimmerx-component@^1.0.4",
```

Then run `yarn install` (or `yarn up` to force lockfile update).

### For glint package updates

Update version ranges in `client/package.json`:
```json
"@norith/glint-core": "^1.0.1",
```

Then run `yarn install`.

### For glimmer.js runtime updates

These are transitive dependencies of `@norith/glimmerx-*`. If glimmer-experimental's `package.json` uses `^` ranges (e.g., `"@norith/glimmer-tracking": "^1.0.1"`), consumers get updates automatically on `yarn install`. If the range needs bumping, publish a new glimmer-experimental version first.

## Key Architectural Decisions

### Why npm aliases for @glimmerx but not @glint?

**@glimmerx:** Consumer source code uses `import from '@glimmerx/component'`. npm aliases (`"@glimmerx/component": "npm:@norith/glimmerx-component@..."`) allow this to work without changing any source files.

**@glint:** The Glint packages have internal type declarations that cross-reference each other using `@norith/glint-*` paths. npm aliases don't work because TypeScript resolves types through the actual package in `node_modules`, and the internal `import("@norith/glint-template/-private/dsl")` paths must match. Consumer apps reference `@norith/glint-*` directly.

### Why do @glimmerx/* references still exist in the Glint fork?

`@norith/glint-environment-glimmerx` has peer dependencies on `@glimmerx/component`, `@glimmerx/modifier`, `@glimmerx/helper` using the `@glimmerx/*` names. This matches what consumers have in their `node_modules` (via aliases). Changing to `@norith/glimmerx-*` would break peer dependency resolution.

### Why is @glimmer/syntax pinned differently?

The consumer webapp pins `@glimmer/syntax@^0.92.0`. Between 0.84 and 0.92, `getTemplateLocals()` stopped treating `with` as a built-in keyword. All `{{#with}}` in the codebase has been replaced with `{{#let}}`, so the newer version works correctly.

### Why does @glimmer/env still need special handling?

`@glimmer/env` exports `DEBUG` as `false` by default. The `@glimmer/babel-plugin-glimmer-env` Babel plugin replaces `import { DEBUG } from '@glimmer/env'` with `true` (dev) or `false` (production) at compile time. This is configured in `client/src/.babelrc.js`.
