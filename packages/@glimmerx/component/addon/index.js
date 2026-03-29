export { default } from '@norith/glimmer-component';
export { tracked } from '@norith/glimmer-tracking';

export function hbs() {
  throw new Error('hbs template should have been compiled at build time');
}
