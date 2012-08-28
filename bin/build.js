var fs = require('fs'),
    path = require('path'),
    handlebars = require('handlebars'),
    packageJSON = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')));

var templateCache = {},
    override = {
      'constructor-before': '',
      'constructor-after': '',
      configure: '',
      extend: '',
      on: ''
    };

function renderTemplate(name, data) {
  if (!templateCache[name]) {
    var filename = path.join(__dirname, '..', 'src', name) + '.js';
    templateCache[name] = handlebars.compile(fs.readFileSync(filename).toString());
  }
  data = data || {};
  data.version = packageJSON.version;
  data.override = override;
  data.ldelim = '{';
  data.rdelim = '}';
  return templateCache[name](data);
}

function writeFile(name, output) {
  var filename = path.join(__dirname, '..', 'dist', name) + '.js';
  fs.writeFileSync(filename, output);
  console.log('generated ' + filename);
}

var loadedOverrides = [];
function loadOverrides(plugin) {
  if (loadedOverrides.indexOf(plugin) !== -1) {
    return;
  }
  loadedOverrides.push(plugin);
  var folderPath = path.join(__dirname, '..', 'src', plugin);
  if (path.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach(function(overrideFile) {
      if (overrideFile.match(/\.js$/)) {
        var overrideFilePath = path.join(folderPath, overrideFile);
        override[overrideFile.replace(/\.js$/, '')] += fs.readFileSync(overrideFilePath).toString();
      }
    });
  }
}

module.exports = function(plugins) {
  if (!plugins.length) {
    plugins = [];
    for (var name in packageJSON.plugins) {
      plugins.push(name);
    }
  }

  var requiredPlugins = [],
      outputOrder = ['thorax'],
      output = '';

  plugins.forEach(function(plugin) {
    loadOverrides(plugin);
    var deps = packageJSON.plugins[plugin] || [];
    if (deps.length) {
      deps.forEach(function(dep) {
        if (outputOrder.indexOf(dep) === -1) {
          outputOrder.push(dep);
          loadOverrides(dep);
        }
      });
    }
    if (outputOrder.indexOf(plugin) === -1) {
      outputOrder.push(plugin);
    }
  });

  outputOrder.forEach(function(item) {
    output += renderTemplate(item) + '\n';
  });

  writeFile('thorax', renderTemplate('fragments/scope', {
    'yield': output
  }));
};
