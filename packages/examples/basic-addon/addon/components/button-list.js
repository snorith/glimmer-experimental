import Component, { hbs } from '@norith/glimmerx-component';
import { action } from '@norith/glimmerx-modifier';
import { fn } from '@norith/glimmerx-helper';
import { service } from '@norith/glimmerx-service';
import SimpleButton from './simple-button';

export default class ButtonList extends Component {
  @service buttonList;

  @action
  increaseCount(button) {
    button.count++;
  }

  static template = hbs`
    {{#each this.buttonList.buttons as |button|}}
      <SimpleButton
        ...attributes
        @count={{button.count}}
        @onClick={{fn this.increaseCount button}}
      />
    {{/each}}
  `;
}
