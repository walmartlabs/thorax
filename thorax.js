var Thorax,
  mode = 0777,
  path = require('path'),
  fs = require('fs'),
  glob = require("glob"),
  child = require('child_process');

//private methods
var loadGenerators = function() {
    glob.globSync(path.join(__dirname, 'generators', '*', 'index.js')).forEach(function(file) {
      this.generators[file.split('/').pop().replace(/\.js$,/, '')] = require(file);
    }, this);
  };

//API
modules.exports = Thorax = function(target) {
  this.target = target;
  this.moduleName = '';
  this._generators = {};
  loadGenerators.call(this);

  /*
    camelize = function(string) {
    return string.replace (/(?:^|[-_])(\w)/g, function (_, c) {
      return c ? c.toUpperCase () : '';
    });
  },
  */

};

var methods = {
  log: function(message) {
    console.log('thorax.' + this.generatorName + ': ' + message);
  },
  generate: function(generator_name, next) {
    this.generatorName = generator_name;
    this._generators[generator_name](this, next);
  },
  mkdir: function(name) {
    fs.mkdirSync(path.join(this.target, name), mode);
  },
  copy: function(src, dest) {
    fs.writeFileSync(path.join(this.target, dest), fs.readFileSync(src));
  },
  template: function() {
    
  },
  packageJSON: function(callback) {
    var json_path = path.join(this.target, 'package.json');
    fs.writeFileSync(json_path, JSON.stringify(callback(JSON.parse(fs.readFileSync(json_path))), null, 2));
  },
  lumbarJSON: function(callback) {
    var json_path = path.join(this.target, 'lumbar.json');
    fs.writeFileSync(json_path, JSON.stringify(callback(JSON.parse(fs.readFileSync(json_path))), null, 2));
  },
  npmInstall: function(next) {
    var npm_install = child.spawn('cd ' + this.target + '; npm install; cd ..;');
    npm_install.stdout.on('data', function(data) {
      console.log('stdout: ' + data);
    });
    npm_install.stderr.on('data', function(data) {
      console.log('stderr: ' + data);
    });
    npm_install.on('exit', function() {
      next();
    });
  },

  //json helpers
  module: function() {
    
  },
  package: function() {
    
  },
  platform: function() {
    
  }
};

for (var name in methods) {
  Thorax.prototype[name] = methods[name];
}
