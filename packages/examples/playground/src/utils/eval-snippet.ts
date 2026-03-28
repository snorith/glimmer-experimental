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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function require(moduleName: keyof typeof modules): unknown {
  return modules[moduleName];
}

export function evalSnippet(code: string): {
  default: Component;
  services?: { [key: string]: unknown };
} {
  const compiled = compile(code);

  const exports = {};

  eval(compiled.code);

  return exports as { default: Component; services?: { [key: string]: unknown } };
}
