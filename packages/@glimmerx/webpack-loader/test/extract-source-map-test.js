const { expect } = require('chai');
const { extractSourceMap } = require('../index');

describe('extractSourceMap', function () {
  it('extracts an inline base64 source map from the output', function () {
    const sourceMap = { version: 3, file: 'test.js', sources: ['test.js'], mappings: 'AAAA' };
    const encoded = Buffer.from(JSON.stringify(sourceMap)).toString('base64');
    const output = `console.log("hello");\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${encoded}`;

    const { code, map } = extractSourceMap(output);

    expect(code).to.equal('console.log("hello");');
    expect(map).to.deep.equal(sourceMap);
  });

  it('returns null map when no source map comment is present', function () {
    const output = 'console.log("hello");';

    const { code, map } = extractSourceMap(output);

    expect(code).to.equal(output);
    expect(map).to.be.null;
  });

  it('handles multiline code before the source map comment', function () {
    const sourceMap = { version: 3, file: 'test.js', sources: ['test.js'], mappings: 'AAAA;AACA' };
    const encoded = Buffer.from(JSON.stringify(sourceMap)).toString('base64');
    const codeBody =
      'import { hbs } from "@glimmerx/component";\nclass Foo {}\nexport default Foo;';
    const output = `${codeBody}\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${encoded}`;

    const { code, map } = extractSourceMap(output);

    expect(code).to.equal(codeBody);
    expect(map.version).to.equal(3);
    expect(map.mappings).to.equal('AAAA;AACA');
  });
});
