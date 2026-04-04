/**
 * Canonical GlimmerX import paths that should be recognized by build and linting tools.
 * This includes both the original '@glimmerx/*' names (used via npm aliases)
 * and the forked '@norith/glimmerx-*' names.
 */
export const GLIMMERX_COMPONENT_IMPORTS = ['@glimmerx/component', '@norith/glimmerx-component'];

export const GLIMMERX_CORE_IMPORTS = ['@glimmerx/core', '@norith/glimmerx-core'];

export const GLIMMERX_HELPER_IMPORTS = ['@glimmerx/helper', '@norith/glimmerx-helper'];

export const GLIMMERX_MODIFIER_IMPORTS = ['@glimmerx/modifier', '@norith/glimmerx-modifier'];

export const ALL_GLIMMERX_IMPORTS = [
  ...GLIMMERX_COMPONENT_IMPORTS,
  ...GLIMMERX_CORE_IMPORTS,
  ...GLIMMERX_HELPER_IMPORTS,
  ...GLIMMERX_MODIFIER_IMPORTS,
];

/**
 * Checks if a given import path is a canonical GlimmerX component import.
 */
export function isGlimmerXComponentImport(importPath: string): boolean {
  return GLIMMERX_COMPONENT_IMPORTS.includes(importPath);
}
