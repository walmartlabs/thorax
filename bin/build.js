var fs = require('fs'),
    path = require('path'),
    handlebars = require('handlebars'),
    packageJSON = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')));

var templateCache = {},
    override = {
      'static-view-properties': '',
      'collection-options': '',
      'model-options': '',
      'model-change': '',
      destroy: '',
      freeze: '',
      beforeConfigure: '',
      'constructor': '',
      configure: '',
      extend: '',
      on: ''
    },
    includedPlugins = ['thorax'];

handlebars.registerHelper('has-plugin', function(name, options) {
  if (includedPlugins.indexOf(name) === -1) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});

function indent(content, amount) {
  amount = amount || 0;
  amount -= 2;
  function spaces(spaceAmount) {
    var spaces = '';
    for (var i = 0; i < spaceAmount; ++i) {
      spaces += ' ';
    }
    return spaces;
  }
  var lines = content.split('\n');
  return lines.map(function(line, i) {
    var spaceAmount = amount;
    if (i === 0) {
      spaceAmount -= 2;
    }
    if (i === lines.length - 1) {
      spaceAmount += 2;
    }
    return spaces(spaceAmount) + line;
  }).join('\n');
}

handlebars.registerHelper('override', function(key, options) {
  return indent(override[key], options.hash.indent);
});

handlebars.registerHelper('inject', function(name, options) {
  override[name] += '\n  // Begin injected code from "src/' + currentTemplateName + '.js"';
  override[name] += options.fn(this);
  override[name] += '  // End injected code';
});

var currentTemplateName;

function renderTemplate(name, data) {
  currentTemplateName = name;
  if (!templateCache[name]) {
    var filename = path.join(__dirname, '..', 'src', name) + '.js';
    templateCache[name] = handlebars.compile(fs.readFileSync(filename).toString());
  }
  data = data || {};
  data.version = packageJSON.version;
  data.ldelim = '{';
  data.rdelim = '}';
  var output = templateCache[name](data);
  if (name === 'mobile') {
    output += renderTemplate(path.join('mobile', 'fast-click'), data);
    output += renderTemplate(path.join('mobile', 'tap-highlight'), data);
  }
  return output;
}

function writeFile(filename, output) {
  fs.writeFileSync(filename, output);
  console.log('Wrote: ' + filename);
}

function getLicense() {
  return fs.readFileSync(path.join(__dirname, '..', 'LICENSE')).toString().split('\n').map(function(line) {
    return '// ' + line;
  }).join('\n') + '\n';
}

module.exports = function(target, plugins) {
  var buildMobile = false;
  if (plugins.indexOf('--mobile') !== -1) {
    plugins = [];
    buildMobile = true;
  }

  if (!plugins.length) {
    plugins = [];
    for (var name in packageJSON.plugins) {
      if (name !== 'mobile' || (name === 'mobile' && buildMobile)) {
        plugins.push(name);
      }
    }
  }
  console.log('Building Thorax with:', plugins);
  var output = '';

  //loop through first to get a complete list of plugins
  //for the "has-plugin" helper
  plugins.forEach(function(plugin) {
    var deps = packageJSON.plugins[plugin] || [];
    if (deps.length) {
      deps.forEach(function(dep) {
        if (includedPlugins.indexOf(dep) === -1) {
          includedPlugins.push(dep);
        }
      });
    }
    if (includedPlugins.indexOf(plugin) === -1) {
      includedPlugins.push(plugin);
    }
  });

  //load overrides
  includedPlugins.forEach(function(plugin) {
    //rendering the template will cause block helpers to execute
    //collecting the injected overrides
    renderTemplate(plugin);
  });

  //now render
  includedPlugins.forEach(function(item) {
    output += '// Begin "src/' + item + '.js"\n';
    output += renderTemplate(item) + '\n';
    output += '\n// End "src/' + item + '.js"\n\n';
  });

  writeFile(target, getLicense() + renderTemplate('fragments/scope', {
    'yield': output
  }));
};
