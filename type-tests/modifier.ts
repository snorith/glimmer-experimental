import { expectTypeOf } from 'expect-type';
import { on, OnModifier } from '@norith/glimmerx-modifier';

expectTypeOf(on).toEqualTypeOf<OnModifier>();
