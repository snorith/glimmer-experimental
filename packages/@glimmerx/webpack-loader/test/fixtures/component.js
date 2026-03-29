import Component, { hbs } from '@glimmerx/component';

export default class Greeting extends Component {
  static template = hbs`<h1>Hello {{@name}}</h1>`;
}
