import fs from 'fs';
import path from 'path';

// DO NOT DELETE
// This file is used by build system to build a clean npm package with the compiled js files in the root of the package.
// It will not be included in the npm package.

function main() {
  const __dirname = path.resolve();

  // check if dist folder exists
  if (!fs.existsSync(__dirname + '/dist'))
    throw new Error('dist folder has not yet been built!');

  const source = fs.readFileSync(__dirname + '/package.json').toString('utf-8');
  const sourceObj = JSON.parse(source);

  sourceObj.scripts = {};
  sourceObj.devDependencies = {};

  if (sourceObj.main.startsWith('dist/')) {
    sourceObj.main = sourceObj.main.slice(5);
  }

  fs.writeFileSync(
    __dirname + '/dist/package.json',
    Buffer.from(JSON.stringify(sourceObj, null, 2), 'utf-8')
  );
  fs.writeFileSync(
    __dirname + '/dist/version.txt',
    Buffer.from(sourceObj.version, 'utf-8')
  );

  fs.copyFileSync(__dirname + '/.npmignore', __dirname + '/dist/.npmignore');
}

main();
