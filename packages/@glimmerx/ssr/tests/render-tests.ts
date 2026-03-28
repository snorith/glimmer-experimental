import renderTests, { Constructor } from '@norith/glimmerx-core/tests/render-tests';
import Component from '@norith/glimmerx-component';
import { renderToString, RenderOptions } from '..';

renderTests('@glimmer/ssr', async (component: Constructor<Component>, options?: RenderOptions) => {
  return await renderToString(component, options);
});
