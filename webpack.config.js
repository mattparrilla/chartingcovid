const path = require("path");
const sass = require("sass");
const autoprefixer = require('autoprefixer');

module.exports = {
  entry: {
    index: ["./src/sass/style.scss", "./src/js/index.js"]
  },
  output: {
    path: path.resolve(__dirname, "static"),
    filename: "[name].js"
  },
  devtool: "eval-source-map",
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'style.css',
            },
          },
          { loader: 'extract-loader' },
          { loader: 'css-loader' },
          {
            loader: 'postcss-loader',
            options: {
              plugins: () => [autoprefixer()]
            }
          },
          {
            loader: 'sass-loader',
            options: {
              // Prefer Dart Sass
              implementation: sass,
              sassOptions: {
                includePaths: ['./node_modules']
              },
            },
          },
        ]
      }
    ],
  },
  mode: "development"
};
