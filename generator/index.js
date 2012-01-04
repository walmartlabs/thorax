var fs = require('fs'),
  path = require('path');

module.exports = function(thorax, next) {
  thorax.log('creating application in: ' + thorax.target + '');

  //create folder structure
  [
    null,
    'app',
    path.join('app', 'models'),
    path.join('app', 'collections'),
    path.join('app', 'views'),
    path.join('app', 'routers'),
    path.join('app', 'lib'),
    path.join('app', 'platform'),
    path.join('app', 'styles'),
    path.join('app', 'styles', 'plugins'),
    path.join('app', 'templates'),
    'public',
    'generators',
    'tasks'
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
    path.join('generators', 'model.handlebars'),
    path.join('generators', 'router.handlebars'),
    path.join('generators', 'view.handlebars')
  ].forEach(function(generator) {
    thorax.copy(path.join(__dirname, generator), generator);
  });

  //Jakefile
  thorax.writeFile('Jakefile', thorax.render(path.join(__dirname, 'Jakefile.handlebars'),{}));

  //TODO: remove need for this
  thorax.mkdir('config');
  thorax.copy(path.join(__dirname, 'config', 'dev.json'), path.join('config', 'dev.json'));

  //project subclass stubs
  [
    'collection',
    'model',
    'router',
    'view'
  ].forEach(function(type) {
    var output = thorax.render(path.join(__dirname, 'app', type + '.js.handlebars'),{});
    thorax.writeFile(path.join('app', type + '.js'), output);
  });

  //initialize lumbar, thorax and package json files
  thorax.lumbarJSON = {};

  thorax.packageJSON = {};

  thorax.thoraxJSON = {
    modifyLumbarJSON: true,
    paths: {
      lib: "app/lib",
      views: "app/views",
      collections: "app/collections",
      models: "app/models",
      routers: "app/routers",
      styles: "app/styles",
      templates: "app/templates",
      generators: "generators"
    },
    language: "javascript"
  };
  thorax.writeFile('thorax.json', JSON.stringify(thorax.thoraxJSON));

  //default lumbar json
  thorax.lumbarJSON = {
    application: {
      name: thorax.project,
      module: 'base'
    },
    moduleMap: 'Thorax.moduleMap',
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
    styles: [],
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
      thorax: '*',
      growl: '~1.1',
      stylus: 'http://static.incaseofstairs.com/stylus.tar.gz',
      nib: '~0.0.8',
      wrench: '~1.1',
      jake: '*'
    }
  };

  next();
};
