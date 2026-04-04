# Logic Review Report: Glimmer Experimental Fork
**Date:** 2026-04-03
**Scope:** `glimmer-experimental`

### 1. Overview
The `glimmer-experimental` codebase provides the primary API surface and tooling for the GlimmerX ecosystem. The architectural logic is centered around thin wrappers that bridge the consumer's components and services to the underlying `glimmer.js` runtime. 

The review identifies risks in the "dual-path" implementation (supporting both `@glimmerx/*` and `@norith/glimmerx-*`), brittle identification of Glimmer components in static analysis tools (ESLint/Prettier), and simplistic service instantiation logic in the core DI (Dependency Injection) layer.

---

### 2. Findings by Module/File

#### A. `@glimmerx/eslint-plugin` (Static Analysis)

| Finding | File / Reference | Criticality |
|:---|:---|:---|
| **Brittle `hbs` Import Detection** | `lib/rules/template-vars.js:46-56` | **Medium** |
| **Lack of Namespace Support** | `lib/rules/template-vars.js:47` | **Low** |

*   **Brittle `hbs` Import Detection:** The rule uses a module-level variable `isGlimmerSfc` to track if `hbs` has been imported. However, it returns early if `isGlimmerSfc` is already true. If a file imports from both `@glimmerx/component` and `@norith/glimmerx-component`, only the first one found will be registered. More importantly, if `hbs` is imported from one of these but renamed (e.g., `import { hbs as myHbs }`), the rule correctly handles the local name but might fail if there are multiple such imports or if it's imported alongside other members.
*   **Lack of Namespace Support:** The rule only checks `ImportSpecifier`. It does not handle `ImportDefaultSpecifier` or `ImportNamespaceSpecifier` (e.g., `import * as Glimmer from '@glimmerx/component'; Glimmer.hbs(...)`). While GlimmerX primarily uses named imports, the logic is incomplete for a robust linting tool.

#### B. `@glimmerx/core` (Runtime)

| Finding | File / Reference | Criticality |
|:---|:---|:---|
| **Heuristic-based Constructor Detection** | `src/owner.ts:12-16` | **Medium** |
| **Service Dependency Ordering** | `src/owner.ts:39-47` | **Medium** |

*   **Heuristic-based Constructor Detection:** The `isConstructor` function uses `func.prototype.constructor === func`. This heuristic can be unreliable for certain transpiled classes (e.g., those using older Babel transforms or specific TS configurations) or for objects that have been manually manipulated. If a service is a plain object that happens to satisfy this check, it will be called with `new`, leading to a runtime error.
*   **Service Dependency Ordering:** Services are instantiated lazily when looked up. If Service A depends on Service B (passed via the `Owner` in the constructor), and Service B has not been looked up yet, it works. However, there is no circular dependency detection. A circular dependency between two services will result in a stack overflow during the `new maybeConstructor(this)` call.

#### C. `@glimmerx/prettier-plugin-component-templates` (Tooling)

| Finding | File / Reference | Criticality |
|:---|:---|:---|
| **Unvalidated `hbs` Tag Formatting** | `index.js:42-56` | **Low** |

*   **Unvalidated `hbs` Tag Formatting:** The Prettier plugin identifies templates solely by the tag name `hbs`. Unlike the ESLint plugin, it does *not* verify if `hbs` was actually imported from a GlimmerX package. While this reduces overhead, it leads to "false positive" formatting of any tagged template literal named `hbs`, even if it belongs to a different library (e.g., a custom SQL or CSS tag named `hbs`).

#### D. `@glimmerx/webpack-loader` (Build Tooling)

| Finding | File / Reference | Criticality |
|:---|:---|:---|
| **Brittle Source Map Extraction** | `index.js:39-49` | **Low** |

*   **Brittle Source Map Extraction:** The loader uses a regex `/\n\/\/# sourceMappingURL=.../` to extract source maps from the Babel output. This assumes the source map is always at the very end of the output and uses the `data:` URI format. While consistent with the current `babel-plugin-htmlbars-inline-precompile` behavior, it lacks robustness if upstream tools change their source map emission format.

---

### 3. Root Cause Analysis
1.  **Static Analysis Shortcuts:** Both the ESLint and Prettier plugins use simplified heuristics to identify Glimmer templates. This is often done for performance and ease of implementation but fails in edge cases involving aliasing, re-exports, or conflicting tag names.
2.  **DI Simplicity:** The `Owner` implementation is designed to be extremely lightweight (GlimmerX's "thin wrapper" philosophy). However, this simplicity omits standard DI features like robust type detection and circularity guards, which are expected in larger applications.
3.  **Fragmented Source Truth:** The logic for identifying "GlimmerX imports" is duplicated across the Webpack loader, ESLint plugin, and Babel preset. Each implementation differs slightly (e.g., the loader uses an array, the ESLint plugin uses a logical OR, the Babel preset uses an object), leading to inconsistent behavior when new aliases are added.

---

### 4. Suggested Fixes

1.  **Unified Import Identification (Medium Priority):** 
    Create a internal shared utility (or constant) that defines the valid GlimmerX entry points. Ensure all tools (ESLint, Webpack, Babel) use this shared list to prevent "alias-blind" gaps.

2.  **Robust ESLint Scope Tracking (High Priority):**
    Refactor `template-vars.js` to use ESLint's built-in scope analysis (`context.getScope()`) to find the definition of the `hbs` tag, rather than manually parsing `ImportSpecifiers`. This automatically handles renaming, re-assignment, and different import styles.

3.  **DI Circularity Guard (Medium Priority):**
    Add a simple "instantiation stack" to `Owner.lookup` to detect and throw a descriptive error when circular service dependencies are encountered.
    ```typescript
    private instantiating = new Set<string>();
    // ... in lookup()
    if (this.instantiating.has(name)) throw new Error(`Circular dependency detected: ${name}`);
    this.instantiating.add(name);
    try { /* instantiate */ } finally { this.instantiating.delete(name); }
    ```

4.  **Refine Constructor Detection (Low Priority):**
    Improve `isConstructor` by checking for the `class` keyword in the function's string representation or by using a more robust check that accounts for common transpilation patterns.

---

### 5. Criticality Rating

*   **High:** None. No immediate runtime crashes in standard paths.
*   **Medium:** `ImportSpecifier` logic in ESLint (incorrect undef/unused reports), `isConstructor` heuristic (potential runtime errors with unusual service objects), and lack of circular dependency detection in `Owner`.
*   **Low:** Prettier tag name collisions, source map extraction brittleness.
