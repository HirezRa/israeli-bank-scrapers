const { run: jscodeshift } = require("jscodeshift/src/Runner");
const path = require("node:path");

module.exports = async function () {

  const transformPath = path.resolve(__dirname, "./puppeteer-imports.js");
  const paths = [path.resolve(__dirname, "../../src")];
  const options = {
    extensions: "ts",
    parser: "ts",
  };

  const res = await jscodeshift(transformPath, paths, options);
  console.log(res);
};
