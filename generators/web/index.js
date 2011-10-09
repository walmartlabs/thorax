var path = require('path');

module.exports = function(thorax, next) {
  var zepto_path = path.join('app', 'lib', 'jquery.js');
  thorax.copy(path.join(__dirname, zepto_path), zepto_path);
  thorax.lumbarJSON.modules.base.files.unshift({src: zepto_path, global: true});

  //thorax.lumbarJSON(function(json) {
  //  json.platforms.push('web');
  //  json.packages.web = {
  //    platforms: ['web'],
  //    combine: false,
  //    modules: ['base', 'home']
  //  };
  //  return json;
  //});

  next();
};
