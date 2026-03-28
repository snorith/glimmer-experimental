import { Configuration } from 'webpack';

export function webpack(config: Configuration) {
  const configRules = (config.module && config.module.rules) || [];
  return {
    ...config,
    externals: {
      fs: 'fs',
    },
    module: {
      ...config.module,
      rules: [
        ...configRules,
        {
          test: /\.(ts|gts)$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  '@norith/glimmerx-babel-preset',
                  [
                    '@babel/preset-env',
                    {
                      modules: false,
                    },
                  ],
                  '@babel/preset-typescript',
                ],
              },
            },
            '@norith/glimmerx-webpack-loader',
          ],
        },
        {
          test: /\.(js|gjs)$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  '@norith/glimmerx-babel-preset',
                  [
                    '@babel/preset-env',
                    {
                      modules: false,
                    },
                  ],
                ],
              },
            },
            '@norith/glimmerx-webpack-loader',
          ],
        },
      ],
    },
    resolve: {
      plugins: [],
      extensions: ['.js', '.ts', '.gjs', '.gts'],
      alias: {
        '@norith/glimmerx-core$': require.resolve('@norith/glimmerx-core'),
        '@norith/glimmerx-component$': require.resolve('@norith/glimmerx-component'),
      },
    },
  };
}
