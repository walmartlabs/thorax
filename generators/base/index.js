var fs = require('fs'),
  path = require('path');

module.exports = function(thorax, next) {
  //create project dir
  thorax.mkdir(thorax.target);

  //create folder structure
  [
    path.join(thorax.target),
    path.join(thorax.target, 'app'),
    path.join(thorax.target, 'app', 'models'),
    path.join(thorax.target, 'app', 'collections'),
    path.join(thorax.target, 'app', 'views'),
    path.join(thorax.target, 'app', 'routers'),
    path.join(thorax.target, 'app', 'lib'),
    path.join(thorax.target, 'app', 'platform'),
    path.join(thorax.target, 'app', 'styles'),
    path.join(thorax.target, 'app', 'templates'),
    path.join(thorax.target, 'public'),
    path.join(thorax.target, 'generators')
  ].forEach(thorax.mkdir);

  //core libraries
  [
    'underscore',
    'backbone',
    'handlebars.vm',
    'script',
    'thorax'
  ].forEach(function(library_name) {
    var library_path = path.join('app', 'lib', name + '.js');
    thorax.copy(path.join(__dirname, library_path), library_path);
  });
  
  //initialize lumbar and package json files
  fs.writeFileSync(path.join(thorax.target, 'lumbar.json'), '{}');
  fs.writeFileSync(path.join(thorax.target, 'package.json'), '{}');

  //default lumbar json
  thorax.lumbarJSON(function() {
    return {
      application: {
        name: 'MODULE',
        module: 'base'
      },
      packages: {},
      platforms: [],
      modules: {
        base: {
          files: [
            {src: 'app/lib/zepto.js', global: true},
            {src: 'app/lib/underscore.js', global: true},
            {src: 'app/lib/backbone.js', global: true},
            {src: 'app/lib/handlebars.vm.js', global: true},
            {src: 'app/lib/script.js', global: true, platform: 'web'},
            {src: 'app/lib/thorax.js', global: true},
            'package_config.json',
            'module_map.json'
          ]
        }
      },
      templates: {
        precompile: {
          knownHelpers: [
            'template',
            'view'
          ],
          knownHelpersOnly: true
        }
      }
    };
  });

  //default package json
  thorax.packageJSON(function() {
    return {
      name: this.moduleName,
      dependencies: [
        lumbar: '>=0.5.3'
      ]
    }
  });
};
