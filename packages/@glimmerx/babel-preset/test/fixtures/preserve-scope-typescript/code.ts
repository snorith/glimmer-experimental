import Component, { hbs } from '@norith/glimmerx-component';
import { on } from '@norith/glimmerx-modifier';
import PlainAwait from 'components/PlainAwait';

export default class Foo extends Component {
  go() {}
  static template = hbs`<PlainAwait /><button {{on 'click' this.go}}>Go</button>`;
}
