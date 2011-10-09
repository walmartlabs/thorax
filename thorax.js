var Thorax,
  mode = 0777,
  path = require('path'),
  fs = require('fs'),
  child = require('child_process'),
  handlebars = require('handlebars');

//private methods
var loadGenerators = function() {
    fs.readdirSync(path.join(__dirname, 'generators')).forEach(function(generator_dir) {
      this._generators[generator_dir.split('/').pop()] = require(path.join(__dirname, 'generators', generator_dir, 'index.js'));
    }, this);
  },
  camelize = function(string) {
    return string.replace (/(?:^|[-_])(\w)/g, function (_, c) {
      return c ? c.toUpperCase () : '';
    });
  };

//API
module.exports = function(target, options) {
  this.generatorName = 'base'; //for thorax.log
  this.loadPrefix = '';
  this.target = target || process.cwd();
  this.project = camelize(this.target.split('/').pop());
  this._generators = {};
  loadGenerators.call(this);
  this._packageJSONPath = path.join(this.target, 'package.json');
  this._lumbarJSONPath = path.join(this.target, 'lumbar.json');
  if (options && options.create) {
    this.mkdir(null); //creates the project directory
    fs.writeFileSync(this._lumbarJSONPath, '{}');
    fs.writeFileSync(this._packageJSONPath, '{}');
    this.packageJSON = {};
    this.lumbarJSON = {};
  } else {
    try {
      this.packageJSON = JSON.parse(fs.readFileSync(this._packageJSONPath));
      this.lumbarJSON = JSON.parse(fs.readFileSync(this._lumbarJSONPath));
    } catch(e) {
      thorax.log('error: ' + this.target + ' does not appear to be a Thorax project directory');
    }
  }
};

//actions
module.exports.actions = {
  init: function(target, generator) {
    var thorax = new module.exports(target, {
      create: true
    });

    var complete = function() {
      thorax.saveConfigs(function(){
        //empty module name will install from generated package.json
        thorax.npmInstall('',function() {
          thorax.log('init complete');
        });
      });
    };

    thorax.generate('base', function() {
      if (generator) {
        thorax.generate(generator, complete);
      } else {
        complete();
      }
    });
  },
  install: function(module_path) {
    var bits = module_path.split('@'),
      module_name = bits[0].replace(/\/$/,'').split('/').pop(),
      version = bits[1] || '*',
      thorax = new module.exports();
    thorax.packageJSON.dependencies[module_name] = version;
    thorax.saveConfigs(function() {
      thorax.npmInstall(module_path, function(installed_module_path) {
        //after installing the npm package, read the config and:
        // - copy package.main to app/lib if present and package.thorax isn't
        // - execute package.thorax.scripts.install if present
        // - copy package.thorax.files if present
        //module_path will now refer to the local filesystem path, not the supplied argument
        module_path = path.join(thorax.target, installed_module_path);
        try {
          var module_json = JSON.parse(fs.readFileSync(path.join(module_path, 'package.json')));
        } catch(e) {
          thorax.log('invalid npm/thorax module: ' + module_name);
          return;
        }
        if (module_json.main && !module_json.thorax) {
          thorax.copy(path.join(module_path, module_json.main), path.join('app', 'lib', module_json.main.split('/').pop()));
        }
        if (module_json.thorax) {
          if (module_json.thorax.scripts && module_json.thorax.scripts.install) {
            require(path.join(module_path, module_json.thorax.scripts.install))(thorax);
          }
          if (module_json.thorax.files) {
            module_json.thorax.files.forEach(function(file) {
              thorax.copy(path.join(module_path, file), file);
            });
          }
        }
        thorax.saveConfigs(function() {
          thorax.log('npm/thorax module install complete');
        });
      });
    });
  },

  view: function(name) {
    
  },

  'collection-view': function(name) {
    
  },

  model: function(name) {
    
  },

  collection: function(name) {
    
  },

  router: function(name) {
    
  },

  template: function(name) {
    
  },

  platform: function(name) {
    
  },

  'package': function(name) {
    
  },

  'module': function(name) {
    
  }
};

//instance methods
var methods = {
  saveConfigs: function(next) {
    fs.writeFileSync(this._packageJSONPath, JSON.stringify(this.packageJSON, null, 2));
    fs.writeFileSync(this._lumbarJSONPath, JSON.stringify(this.lumbarJSON, null, 2));
    if (next) {
      next();
    }
  },
  log: function(message) {
    console.log('thorax.' + this.generatorName + ': ' + message);
  },
  generate: function(generator_name, next) {
    this.generatorName = generator_name;
    this._generators[generator_name](this, next);
  },
  mkdir: function(name) {
    fs.mkdirSync((!name ? this.target : path.join(this.target, name)), mode);
  },
  copy: function(src, dest) {
    fs.writeFileSync(path.join(this.target, dest), fs.readFileSync(src));
  },
  writeFile: function(dest, contents) {
    fs.writeFileSync(path.join(this.target, dest), contents);
  },
  template: function(src, context) {
    var template_src = fs.readFileSync(src),
      template = Handlebars.compile(template_src);
    context = context || {};
    context.project = this.project;
    context.target = this.target;
    context.loadPrefix = this.loadPrefix;
    return template(context);
  },
  npmInstall: function(module_path, next) {
    var command = module_path === ''
      ? 'cd ' + path.join(process.cwd(), this.target) + '; npm install ' + module_path + '; cd ..;'
      : 'npm install ' + module_path + ';' 
    ;

    child.exec(command,function(error, stdout, stderr) {
      var path;
      if (stdout && stdout !== '') {
        console.log('thorax.npm-install: ' + stdout);
        path = stdout.split(/\n/).shift().replace(/\s$/, '').split(/\s/).pop();
      }
      if (stderr && stderr !== '') {
        console.error('thorax.npm-install error: ' + stderr);
        path = false;
      }
      if (next) {
        next(path);
      }
    });
  },

  //json helpers
  addModule: function() {
    
  },
  addPackage: function() {
    
  },
  addPlatform: function() {
    
  }
};

for (var name in methods) {
  module.exports.prototype[name] = methods[name];
}
