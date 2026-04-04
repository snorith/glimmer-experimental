import * as _core from '@glimmer/core';
import * as _xCore from '@norith/glimmerx-core';
import * as _xHelper from '@norith/glimmerx-helper';
import * as _xModifier from '@norith/glimmerx-modifier';
import * as _xService from '@norith/glimmerx-service';
import Component, * as _xComponent from '@norith/glimmerx-component';
import compile from './compile';

const modules = {
  '@glimmer/core': _core,
  '@norith/glimmerx-core': _xCore,
  '@norith/glimmerx-component': _xComponent,
  '@norith/glimmerx-helper': _xHelper,
  '@norith/glimmerx-modifier': _xModifier,
  '@norith/glimmerx-service': _xService,
};

function requireModule(moduleName: keyof typeof modules): unknown {
  return modules[moduleName];
}

export function evalSnippet(code: string): {
  default: Component;
  services?: { [key: string]: unknown };
} {
  const compiled = compile(code);
  type SnippetExports = { default?: Component; services?: { [key: string]: unknown } };
  const exports: SnippetExports = {};
  const moduleFactory = new Function('require', 'exports', `"use strict";\n${compiled.code}`) as (
    require: (name: keyof typeof modules) => unknown,
    exports: SnippetExports
  ) => void;

  moduleFactory(requireModule, exports);

  return exports as { default: Component; services?: { [key: string]: unknown } };
}
