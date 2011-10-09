var fs = require('fs'),
  path = require('path');

module.exports = function(thorax, next) {
  thorax.log('creating application in: ' + thorax.target + '');

  //create folder structure
  [
    path.join('app'),
    path.join('app', 'models'),
    path.join('app', 'collections'),
    path.join('app', 'views'),
    path.join('app', 'routers'),
    path.join('app', 'lib'),
    path.join('app', 'platform'),
    path.join('app', 'styles'),
    path.join('app', 'styles', 'plugins'),
    path.join('app', 'templates'),
    path.join('public'),
    path.join('generators')
  ].forEach(thorax.mkdir, thorax);

  //core libraries
  [
    'underscore',
    'backbone',
    'handlebars.vm',
    'script',
    'thorax'
  ].forEach(function(library_name) {
    var library_path = path.join('app', 'lib', library_name + '.js');
    thorax.copy(path.join(__dirname, library_path), library_path);
  });

  //url import plugins
  [
    'url-import.js',
    'url-import@1.5x.js',
    'url-import@2x.js'
  ].forEach(function(name) {
    var plugin_path = path.join('app', 'styles', 'plugins', name);
    thorax.copy(path.join(__dirname, plugin_path), plugin_path);
  });

  //generators
  [
    path.join('generators', 'collection-view.handlebars'),
    path.join('generators', 'collection.handlebars'),
    path.join('generators', 'index.handlebars'),
    path.join('generators', 'init.handlebars'),
    path.join('generators', 'model.handlebars'),
    path.join('generators', 'router.handlebars'),
    path.join('generators', 'view.handlebars')
  ].forEach(function(generator) {
    thorax.copy(path.join(__dirname, generator), generator);
  });

  //Jakefile
  thorax.copy(path.join(__dirname, 'Jakefile'), 'Jakefile');
  
  //initialize lumbar and package json files
  fs.writeFileSync(path.join(thorax.target, 'lumbar.json'), '{}');
  fs.writeFileSync(path.join(thorax.target, 'package.json'), '{}');

  //default lumbar json
  thorax.lumbarJSON = {
    application: {
      name: thorax.project,
      module: 'base'
    },
    language: 'javascript',
    loadPrefix: thorax.loadPrefix,
    packages: {},
    platforms: [],
    modules: {
      base: {
        files: [
          {src: 'app/lib/underscore.js', global: true},
          {src: 'app/lib/backbone.js', global: true},
          {src: 'app/lib/handlebars.vm.js', global: true},
          {src: 'app/lib/script.js', global: true},
          {src: 'app/lib/thorax.js', global: true},
          'package_config.json',
          'module_map.json'
        ]
      }
    },
    templates: {
      engine: 'handlebars',
      precompile: {
        knownHelpers: [
          'template',
          'view'
        ],
        knownHelpersOnly: true
      }
    }
  };

  //default package json
  thorax.packageJSON = {
    name: thorax.project,
    version: '0.0.1',
    dependencies: {
      lumbar: '~0.5.3',
      growl: '~1.1',
      stylus: 'http://static.incaseofstairs.com/stylus.tar.gz',
      nib: '~0.0.8',
      wrench: '~1.1'
    }
  };

  next();
};
