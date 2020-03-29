const path = require("path");

module.exports = {
  entry: {
    index: "./src/js/index.js"
  },
  output: {
    path: path.resolve(__dirname, "static/js"),
    filename: "[name].js"
  },
  devtool: "eval-source-map",
  mode: "development"
};
