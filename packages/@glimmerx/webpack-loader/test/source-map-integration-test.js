const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const { SourceMapConsumer } = require('source-map');

const FIXTURE_DIR = path.resolve(__dirname, 'fixtures');
const LOADER_PATH = path.resolve(__dirname, '..', 'index.js');
const glimmerxBabelPreset = require(path.resolve(__dirname, '..', '..', 'babel-preset'));

function runWebpack(entry, devtool) {
  return new Promise((resolve, reject) => {
    const compiler = webpack({
      mode: 'development',
      devtool: devtool || 'source-map',
      context: FIXTURE_DIR,
      entry: `./${entry}`,
      output: {
        path: path.resolve(__dirname, 'dist'),
        filename: `${entry}.bundle.js`,
        libraryTarget: 'commonjs2',
      },
      resolve: {
        extensions: ['.ts', '.js'],
      },
      module: {
        rules: [
          {
            test: /\.[jt]s$/,
            use: [
              {
                loader: 'babel-loader',
                options: {
                  presets: [[glimmerxBabelPreset, { __loadPlugins: true }]],
                },
              },
              {
                loader: LOADER_PATH,
              },
            ],
          },
        ],
      },
      externals: {
        '@glimmerx/component': 'commonjs @glimmerx/component',
        '@norith/glimmer-core': 'commonjs @norith/glimmer-core',
        '@norith/glimmer-component': 'commonjs @norith/glimmer-component',
        '@norith/glimmer-tracking': 'commonjs @norith/glimmer-tracking',
      },
    });

    compiler.run((err, stats) => {
      if (err) return reject(err);
      if (stats.hasErrors()) {
        const errors = stats.toJson().errors;
        return reject(
          new Error(errors.map((e) => (typeof e === 'string' ? e : e.message)).join('\n'))
        );
      }

      const bundlePath = path.resolve(__dirname, 'dist', `${entry}.bundle.js`);
      const mapPath = bundlePath + '.map';

      const bundleCode = fs.readFileSync(bundlePath, 'utf-8');
      const rawMap = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));

      resolve({ bundleCode, rawMap });
    });
  });
}

describe('webpack source map integration', function () {
  this.timeout(30000);

  after(function () {
    // Clean up dist directory
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      fs.readdirSync(distDir).forEach((f) => fs.unlinkSync(path.join(distDir, f)));
      fs.rmdirSync(distDir);
    }
  });

  it('produces a source map that references the original .js file', async function () {
    const { rawMap } = await runWebpack('component.js');
    const consumer = await new SourceMapConsumer(rawMap);

    try {
      // The source map should contain our original fixture file
      const sources = consumer.sources;
      const fixtureSource = sources.find((s) => s.includes('component.js'));
      expect(fixtureSource, 'source map should reference component.js').to.exist;

      // The original source content should contain the hbs template
      const content = consumer.sourceContentFor(fixtureSource);
      if (content) {
        expect(content).to.include('hbs');
        expect(content).to.include('Hello');
      }
    } finally {
      if (consumer.destroy) consumer.destroy();
    }
  });
});
