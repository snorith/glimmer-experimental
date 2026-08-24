import {
  renderComponent as glimmerJsRenderComponent,
  ComponentDefinition,
  RenderComponentOptions as GlimmerJsRenderComponentOptions,
  RenderResult,
} from '@norith/glimmer-core';
import { Dict } from '@glimmer/interfaces';
import Owner from './owner';

export interface RenderComponentOptions extends Omit<GlimmerJsRenderComponentOptions, 'owner'> {
  services?: Dict<unknown>;
}

export default function renderComponent(
  ComponentClass: ComponentDefinition,
  options: RenderComponentOptions
): Promise<RenderResult>;
export default function renderComponent(
  ComponentClass: ComponentDefinition,
  element: HTMLElement
): Promise<RenderResult>;
export default function renderComponent(
  ComponentClass: ComponentDefinition,
  optionsOrElement: RenderComponentOptions | HTMLElement
): Promise<RenderResult> {
  if (optionsOrElement instanceof Element) {
    return glimmerJsRenderComponent(ComponentClass, optionsOrElement);
  }

  const { element, args, services, rehydrate } = optionsOrElement;

  const owner = new Owner(services || {});

  return glimmerJsRenderComponent(ComponentClass, { element, args, owner, rehydrate });
}
