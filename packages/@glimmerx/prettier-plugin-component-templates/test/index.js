const fs = require('fs');
const prettier = require('prettier');
const path = require('path');
const { expect } = require('chai');

describe('integration', function () {
  this.timeout(3000); // Adjust timeout for slow? test.

  const defaults = { extension: '.js', message: 'should match snapshot' };
  async function transform(testKey, options = {}) {
    const { extension, message } = { ...defaults, ...options };
    const testFixtureDir = path.resolve(__dirname, 'fixtures/', testKey);

    const configFile = path.resolve(testFixtureDir, `./config.js`);
    const codeFile = path.resolve(testFixtureDir, `./code${extension}`);
    const outputFile = path.resolve(testFixtureDir, `./output${extension}`);

    const prettierOptions = require(configFile);

    const code = fs.readFileSync(codeFile, 'utf8');
    const expected = fs.readFileSync(outputFile, 'utf8');

    const actual = await prettier.format(code, {
      filepath: codeFile, // Provide the path so prettier can infer parser based off file extension
      ...prettierOptions,
    });

    expect(actual).to.equal(expected, message);
  }

  it('simple-noop', async () => {
    await transform('simple-noop', { message: 'if already formatted, it should do nothing' });
  });

  it('simple-formatted', async () => {
    await transform('simple-formatted', { message: 'should format the simply templates' });
  });

  it('nested-html', async () => {
    // Should produce formatted output where first dom node is inset with one indentation further in.
    await transform('nested-html');
  });

  it('options.hbsSingleQuote', async () => {
    await transform('options-hbs-single-quote');
  });

  it('with comments', async () => {
    await transform('with-comments');
  });

  it('extension .gjs', async () => {
    await transform('extension-gjs', { extension: '.gjs' });
  });

  it('typescript parser', async () => {
    await transform('typescript-parser', { extension: '.ts' });
  });
});
