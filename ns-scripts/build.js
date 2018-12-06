const fs = require('fs-extra');
const path = require('path');

const distSuiteScriptPath = path.join(__dirname, 'dist');

if (fs.existsSync(distSuiteScriptPath)) {
  fs.removeSync(distSuiteScriptPath);
}
