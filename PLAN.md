# Plan: Fork GlimmerX, Glimmer.js & Glint Packages to @norith Scope

## Context

The `@glimmerx/*`, `@glimmer/*` (beta.21), and `@glint/*` (environment-glimmerx) packages are abandoned upstream. This work forks all three repos, publishes them as `@norith/*` on npmjs.com, and updates the consumer webapp to use them.

**Accounts:** GitHub: `snorith` | npmjs.com: `norith`
**Registry scope:** `@norith/`
**Versioning:** `1.0.0` for all packages (clean break)
**Branching:** gitflow — `main` + `develop`

---

## Current State

| Repo | Fork status | Build status | Published? |
|---|---|---|---|
| `snorith/glimmer-experimental` | DONE — renamed, CI pipeline, docs | Builds on Node 20 | No |
| `snorith/glimmer.js` | DONE — renamed, CI pipeline, docs | Builds on Node 20 (with lockfile) | No |
| `snorith/glint` | DONE — renamed, CI pipeline, docs, build fixed | Builds on Node 20 (`tsc --build --force`) | No |
| Webapp (`feature/glimmerx-package-forks`) | Branch created, no changes committed | N/A | N/A |

---

## Phase A — Fix Glint Build — DONE

The Glint monorepo had self-referencing subpath imports (`@norith/glint-core/config-types` from within `@norith/glint-core` itself) that broke the build because the compiled output doesn't exist yet during first compilation.

### ~~A1. Fix self-referencing imports in core package~~ DONE
Converted `@norith/glint-core/config-types` imports to relative `./types.cjs` paths in:
- `packages/core/src/config/environment.ts`
- `packages/core/src/config/loader.ts`
- `packages/core/src/config/config.ts`
- `packages/core/src/transform/template/rewrite-module.ts`
- `packages/core/src/transform/template/template-to-typescript.ts`
- `packages/core/src/transform/template/inlining/tagged-strings.ts`

### ~~A2. Fix scripts package implicit any error~~ DONE (not needed)
The error was caused by `@norith/glint-core` types not being available. Once A1 was fixed and core built, the types resolved correctly. No code change needed.

### ~~A3. Add @norith/glint-environment- prefix to environment resolution~~ DONE
Added `@norith/glint-environment-${name}/glint-environment-definition` as the first resolution candidate in `locateEnvironment()`. This allows `"environment": "glimmerx"` in tsconfig to resolve `@norith/glint-environment-glimmerx`.

### ~~A4. Verify build~~ DONE
Build passes with `tsc --build --force`. Note: `--force` is needed on clean builds due to incremental cache not handling the `.cts` → `.d.cts` compilation correctly on first pass.

### ~~A5. Squash, commit, push~~ DONE
Amended the single commit on develop and force-pushed.

---

## Phase B — First Publish (All Three Repos) — NEXT

Publishing order matters due to dependency chain: `glimmer.js` → `glimmer-experimental` → (independent: `glint`).

### B1. Create npmjs.com Granular Access Token (User Action)
- npmjs.com → Avatar → Access Tokens → Generate New Token → Granular Access Token
- Read and write access, all packages under `@norith/`
- This token is temporary — will be deleted after Trusted Publishing is configured

### B2. Publish glimmer.js packages first (9 packages)
```bash
cd /Users/stephen/WebstormProjects/glimmer.js
yarn install && yarn build
NPM_TOKEN=<token> node scripts/publish-packages.js
```
These must be published first because `glimmer-experimental` depends on them.

### B3. Publish glimmer-experimental packages (13 packages)
```bash
cd /Users/stephen/WebstormProjects/glimmer-experimental
# Remove the local file: resolutions from root package.json first
yarn install --no-lockfile && yarn build
NPM_TOKEN=<token> node scripts/publish-packages.js
```
**Important:** Remove the `resolutions` block with `file:` paths from root `package.json` before publishing. Those are for local dev only.

### B4. Publish glint packages (4 packages)
```bash
cd /Users/stephen/WebstormProjects/glint
yarn install --no-lockfile && yarn build
NPM_TOKEN=<token> node scripts/publish-packages.js
```

### B5. Configure Trusted Publishing on npmjs.com (User Action)
For each of the ~26 published packages:
1. Go to npmjs.com → Package → Settings → Trusted Publishing → Add Publisher
2. Select GitHub Actions
3. Specify: organization/username `snorith`, repository name, workflow `publish.yml`
4. No environment name needed

After configuration, delete the Granular Access Token. All future publishes use OIDC.

### B6. Update publish workflows to remove NPM_TOKEN fallback
Once Trusted Publishing is confirmed working, the `NODE_AUTH_TOKEN` env var in the publish workflows can be removed — OIDC handles auth automatically.

**Note on Trusted Publishing requirements:**
- npm CLI 11.5.1+ / Node 22.14.0+ required (CI workflows already pin Node 22)
- Public repos only (all three forks are public)
- `id-token: write` permission already set in all workflows
- `--provenance` flag already included in publish scripts

---

## Phase C — Webapp Integration

**Branch:** `feature/glimmerx-package-forks` (already created from `develop`)

### C1. Update client/package.json

**GlimmerX packages — use npm aliases (no source code changes):**
```json
"dependencies": {
  "@glimmerx/component": "npm:@norith/glimmerx-component@^1.0.0",
  "@glimmerx/core": "npm:@norith/glimmerx-core@^1.0.0",
  "@glimmerx/helper": "npm:@norith/glimmerx-helper@^1.0.0",
  "@glimmerx/modifier": "npm:@norith/glimmerx-modifier@^1.0.0",
  "@glimmerx/service": "npm:@norith/glimmerx-service@^1.0.0"
},
"devDependencies": {
  "@glimmerx/babel-preset": "npm:@norith/glimmerx-babel-preset@^1.0.0",
  "@glimmerx/eslint-plugin": "npm:@norith/glimmerx-eslint-plugin@^1.0.0",
  "@glimmerx/webpack-loader": "npm:@norith/glimmerx-webpack-loader@^1.0.0"
}
```

**Glint packages — use @norith/ directly (no aliases):**
```json
"devDependencies": {
  "@norith/glint-core": "^1.0.0",
  "@norith/glint-environment-glimmerx": "^1.0.0",
  "@norith/glint-scripts": "^1.0.0",
  "@norith/glint-template": "^1.0.0"
}
```
Glint packages use `@norith/` directly because their internal type declarations cross-reference each other using `@norith/glint-*` paths. npm aliases don't work for this case.

**Remove:**
- `@glimmerx/babel-plugin-component-templates` (vestigial — not used in `.babelrc.js`)
- `@glint/core`, `@glint/environment-glimmerx`, `@glint/scripts`, `@glint/template` (replaced by `@norith/glint-*`)

**Update:**
- `@glimmer/owner` from `^0.85.13` to `^0.93.4`

### C2. Update client/tsconfig.json
Change Glint environment to use full package name:
```json
"glint": {
  "environment": "@norith/glint-environment-glimmerx"
}
```
(Phase A3 adds `@norith/glint-environment-` prefix to the environment resolver so this works.)

### C3. Remove patch-package entry
- Check whether `@glimmer/babel-plugin-glimmer-env` (already in devDependencies) handles `DEBUG` correctly at build time
- If yes: delete `client/patches/@glimmer+env+0.1.7.patch`, remove `patch-package` from devDependencies + postinstall
- If no: keep and document why

### C4. Update webpack.common.js
- Cache group config (~line 141): add `@norith` alongside existing `@glimmerx`, `@tanstack`, `@glimmer`

### C5. Verify
```bash
cd client
yarn install
yarn run lint        # Glint type-checking
yarn run build       # Production webpack build
```

### C6. Update changelog.md
Add entry following existing format.

### C7. Create PR

---

## Phase D — Debugging Improvements (ON HOLD)

Requires Phase B (published packages) to be complete first.

### D1. Patch @tracked decorator in snorith/glimmer.js
- File: `packages/@glimmer/tracking/src/tracked.ts`
- Attach `debugKey` (format: `ClassName#propertyName`) to tracked tags via `@glimmer/validator`'s tag debug API
- Dev-mode only (`NODE_ENV !== 'production'`)

### D2. Enrich render error messages in snorith/glimmer.js
- File: `packages/@glimmer/core/src/` (render/revalidation loop)
- Catch `@glimmer/validator` assertion errors and re-throw with component name context
- Dev-mode only

### D3. Publish patch release
Use the workflow_dispatch publish workflow with `patch` release type.

### D4. Update webapp dependencies
Bump `@norith/glimmerx-component` (and transitively `@norith/glimmer-tracking`) in the webapp.

---

## Phase E — Ongoing Maintenance

### E1. Dependency updates
- Monitor `@glimmer/syntax` releases — update webpack-loader and eslint-plugin as needed
- Monitor TypeScript releases — ensure Glint compatibility
- Monitor Node.js LTS releases — update CI and mise configs

### E2. Publishing cadence
All releases go through `workflow_dispatch` → select major/minor/patch → CI bumps versions, commits, tags, publishes.

### E3. Trusted Publishing maintenance
- npmjs.com Trusted Publishing config is per-package and points to specific workflow files
- If a workflow file is renamed or a repo is transferred, Trusted Publishing must be reconfigured

---

## Dependency Chain (for reference)

```
Consumer App
  ├── @glimmerx/*  (npm aliases → @norith/glimmerx-*)   [glimmer-experimental]
  │     └── @norith/glimmer-*                             [glimmer.js]
  │           └── @glimmer/* 0.84.0                       [glimmer-vm, NOT forked]
  ├── @norith/glint-*  (direct, no aliases)               [glint]
  │     └── @glimmer/syntax                               [glimmer-vm, NOT forked]
  └── @glimmer/owner, @glimmer/env, etc.                  [glimmer-vm, NOT forked]
```

**Publish order:** glimmer.js → glimmer-experimental → glint (independent)

---

## Critical Files

| File | Change |
|---|---|
| `client/package.json` | npm aliases for `@glimmerx/*`, direct `@norith/glint-*`, remove vestigial deps |
| `client/tsconfig.json` | `glint.environment` → `@norith/glint-environment-glimmerx` |
| `client/webpack.common.js` | Cache group: add `@norith` |
| `client/patches/@glimmer+env+0.1.7.patch` | Delete (if Babel plugin handles DEBUG) |
| `glint: packages/core/src/config/environment.ts` | Self-ref fix + add `@norith/glint-environment-` resolution |
| `glint: packages/core/src/config/*.ts` | Self-ref imports → relative paths |
| `glint: packages/core/src/transform/template/*.ts` | Self-ref imports → relative paths |
| `glimmer-experimental: package.json` | Remove local `file:` resolutions before publishing |
