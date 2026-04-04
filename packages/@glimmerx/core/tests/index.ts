import './modifier-tests';
import renderTests, { Constructor } from './render-tests';
import { renderComponent, RenderComponentOptions } from '..';
import Component from '@norith/glimmerx-component';

renderTests(
  '@norith/glimmerx-core',
  async (component: Constructor<Component>, options?: RenderComponentOptions) => {
    const element = document.getElementById('qunit-fixture')!;
    element.innerHTML = '';

    if (options) {
      options.element = element;
      await renderComponent(component, options);
    } else {
      await renderComponent(component, element);
    }

    return element.innerHTML;
  }
);
