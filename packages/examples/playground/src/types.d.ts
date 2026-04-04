declare module '*.svg' {
  const content: string;
  export default content;
}

declare module 'monaco-languages/release/esm/javascript/javascript' {
  export const conf: any;
  export const language: any;
}

declare module '@norith/glimmerx-babel-preset' {
  const preset: unknown;
  export default preset;
}

declare module '@babel/preset-env' {
  const presetEnv: unknown;
  export default presetEnv;
}

declare module '@glimmer/core' {
  export const setComponentTemplate: any;
  export const componentCapabilities: any;
  export type ComponentCapabilities = any;
  export type ComponentDefinition = any;
  export type ComponentManager = any;
  export const setComponentManager: any;
  export const helperCapabilities: any;
  export type HelperManager = any;
  export const setHelperManager: any;
  export const modifierCapabilities: any;
  export type ModifierCapabilities = any;
  export type ModifierManager = any;
  export const setModifierManager: any;
  export const setOwner: any;
  export const getOwner: any;
  export const didRender: any;
  export type RenderComponentOptions = any;
}

declare module '@glimmer/modifier' {
  export const action: any;
}

declare module '@glimmer/ssr' {
  export type RenderOptions = any;
}
