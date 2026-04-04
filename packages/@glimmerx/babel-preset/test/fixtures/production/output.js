var _class, _descriptor, _cantTouchThis, _Test_brand;
function _initializerDefineProperty(e, i, r, l) { r && Object.defineProperty(e, i, { enumerable: r.enumerable, configurable: r.configurable, writable: r.writable, value: r.initializer ? r.initializer.call(l) : void 0 }); }
function _classPrivateMethodInitSpec(e, a) { _checkPrivateRedeclaration(e, a), a.add(e); }
function _classPrivateFieldInitSpec(e, t, a) { _checkPrivateRedeclaration(e, t), t.set(e, a); }
function _checkPrivateRedeclaration(e, t) { if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object"); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _applyDecoratedDescriptor(i, e, r, n, l) { var a = {}; return Object.keys(n).forEach(function (i) { a[i] = n[i]; }), a.enumerable = !!a.enumerable, a.configurable = !!a.configurable, ("value" in a || a.initializer) && (a.writable = !0), a = r.slice().reverse().reduce(function (r, n) { return n(i, e, r) || r; }, a), l && void 0 !== a.initializer && (a.value = a.initializer ? a.initializer.call(l) : void 0, a.initializer = void 0), void 0 === a.initializer ? (Object.defineProperty(i, e, a), null) : a; }
function _initializerWarningHelper(r, e) { throw Error("Decorating class property failed. Please ensure that transform-class-properties is enabled and runs after the decorators transform."); }
import { setComponentTemplate as _setComponentTemplate } from "@norith/glimmer-core";
import { createTemplateFactory as _createTemplateFactory } from "@norith/glimmer-core";
import { assert, deprecate } from '@norith/glimmer-debug';
import { tracked } from '@glimmerx/tracking';
import Component from '@norith/glimmerx-component';
if (false /* DEBUG */) {
  console.log('DEBUG!');
}
(false && assert(true, 'is true'));
(false && !(false) && deprecate('this is deprecated', false, {
  id: 'foo'
}));
let Test = _setComponentTemplate(_createTemplateFactory(
/*
  Hello World
*/
{
  "id": null,
  "block": "[[[1,\"Hello World\"]],[],false,[]]",
  "moduleName": "(unknown template module)",
  "isStrictMode": true
}), (_class = (_cantTouchThis = /*#__PURE__*/new WeakMap(), _Test_brand = /*#__PURE__*/new WeakSet(), class Test extends Component {
  constructor(...args) {
    super(...args);
    _classPrivateMethodInitSpec(this, _Test_brand);
    _initializerDefineProperty(this, "bar", _descriptor, this);
    _classPrivateFieldInitSpec(this, _cantTouchThis, 'mc hammer');
  }
}), _descriptor = _applyDecoratedDescriptor(_class.prototype, "bar", [tracked], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: function () {
    return 123;
  }
}), _class));
function _hammerTime() {}
export { Test as default };
