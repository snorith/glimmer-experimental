import FunctionalModifierManager from './src/functional-modifier-manager';
import FunctionalHelperManager from './src/functional-helper-manager';
import { setModifierManager, setHelperManager } from '@norith/glimmer-core';

const FUNCTIONAL_MODIFIER_MANAGER = new FunctionalModifierManager();
const FUNCTIONAL_MODIFIER_MANAGER_FACTORY = () => FUNCTIONAL_MODIFIER_MANAGER;
const FUNCTIONAL_HELPER_MANAGER = new FunctionalHelperManager();
const FUNCTIONAL_HELPER_MANAGER_FACTORY = () => FUNCTIONAL_HELPER_MANAGER;

// Guard against duplicate registration — can happen when both @glimmerx/core
// (consumer alias) and @norith/glimmerx-core (transitive dep) are bundled
try {
  setModifierManager(FUNCTIONAL_MODIFIER_MANAGER_FACTORY, Function.prototype);
} catch (e) {
  // Already registered
}
try {
  setHelperManager(FUNCTIONAL_HELPER_MANAGER_FACTORY, Function.prototype);
} catch (e) {
  // Already registered
}

export { default as Owner, FactoryIdentifier } from './src/owner';
export { default as renderComponent, RenderComponentOptions } from './src/renderComponent';

export {
  setComponentTemplate,
  componentCapabilities,
  ComponentCapabilities,
  ComponentDefinition,
  ComponentManager,
  setComponentManager,
  helperCapabilities,
  HelperManager,
  setHelperManager,
  modifierCapabilities,
  ModifierCapabilities,
  ModifierManager,
  setModifierManager,
  setOwner,
  getOwner,
  didRender,
} from '@norith/glimmer-core';
