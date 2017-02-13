const path = require('path');
const chalk = require('chalk');
const chokidar = require('chokidar');
const fs = require('fs-extra');

const exitWithError = message => {
  console.error(chalk.red(`ERROR: ${message}`));
  process.exit(1);
};

module.exports = () => {
  const packagePath = path.join(process.cwd(), 'package.json');
  let packageContent = null;
  try {
    packageContent = require(packagePath);
  } catch (error) {
    exitWithError(`Cannot find package.json in ${packagePath}`);
  }
  let srcPath = null;
  try {
    if (!/file:.*/.test(packageContent.dependencies.gluestick)) {
      exitWithError('Gluestick dependency does not contain valid path');
    }
    const pathFromDependency = packageContent.dependencies.gluestick.replace('file://', '').replace('file:', '');
    srcPath = pathFromDependency[0] !== '/'
      ? path.join(
          process.cwd(),
          pathFromDependency,
        )
      : pathFromDependency;
  } catch (error) {
    exitWithError('Invalid package.json');
  }
  const convertFilePath = filePath => filePath.replace(srcPath, path.join(process.cwd(), 'node_modules/gluestick'));
  const watcher = chokidar.watch(`${srcPath}/**/*`, {
    ignored: [
      /(^|[/\\])\../,
      /.*node_modules.*/,
    ],
    persistent: true,
  });
  watcher
    .on('ready', () => {
      const copy = (filePath, type) => {
        const destPath = convertFilePath(filePath);
        fs.copy(filePath, destPath, (err) => {
          if (err) {
            console.error(chalk.red(err));
          } else {
            console.log(chalk.green(`${filePath} -> ${destPath} [${type}]`));
          }
        });
      };

      const remove = (filePath, type) => {
        const destPath = convertFilePath(filePath);
        fs.remove(destPath, (err) => {
          if (err) {
            console.error(chalk.red(err));
          } else {
            console.log(chalk.green(`${destPath} [${type}]`));
          }
        });
      };

      console.log(chalk.blue('Watching for changes...'));
      watcher.on('add', filePath => copy(filePath, 'added'));
      watcher.on('change', filePath => copy(filePath, 'changed'));
      watcher.on('unlink', filePath => remove(filePath, 'removed'));
      watcher.on('unlinkDir', filePath => remove(filePath, 'removed dir'));
      watcher.on('addDir', filePath => {
        const destPath = convertFilePath(filePath);
        fs.ensureDir(destPath, (err) => {
          if (err) {
            console.error(chalk.red(err));
          } else {
            console.log(chalk.green(`${destPath} [added dir]`));
          }
        });
      });
    });
};
