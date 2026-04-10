import { setComponentTemplate as _setComponentTemplate } from "@norith/glimmer-core";
import { createTemplateFactory as _createTemplateFactory } from "@norith/glimmer-core";
import Component from '@norith/glimmerx-component';
import { on } from '@norith/glimmerx-modifier';
import PlainAwait from 'components/PlainAwait';
export default class Foo extends Component {
  go() {}
}
_setComponentTemplate(_createTemplateFactory(
/*
  <PlainAwait /><button {{on 'click' this.go}}>Go</button>
*/
{
  "id": "3B6tIOMC",
  "block": "[[[8,[32,0],null,null,null],[11,\"button\"],[4,[32,1],[\"click\",[30,0,[\"go\"]]],null],[12],[1,\"Go\"],[13]],[],false,[]]",
  "moduleName": "(unknown template module)",
  "scope": () => [PlainAwait, on],
  "isStrictMode": true
}), Foo);
