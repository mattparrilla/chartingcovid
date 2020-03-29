const CompressionPlugin = require("compression-webpack-plugin");
const zopfli = require('@gfx/zopfli');
const webpackConfig = require("./webpack.config");

Object.assign(webpackConfig, {
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new CompressionPlugin({
      test: /\.js$/i,
      compressionOptions: {
        numiterations: 15,
      },
      algorithm(input, compressionOptions, callback) {
        return zopfli.gzip(input, compressionOptions, callback);
      },
    }),
  ],
  devtool: "source-map"
});

module.exports = webpackConfig;
