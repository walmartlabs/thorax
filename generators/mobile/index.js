var path = require('path');

module.exports = function(thorax, next) {
  var zepto_path = path.join('app', 'lib', 'zepto.js');
  thorax.copy(path.join(__dirname, zepto_path), zepto_path);
  thorax.lumbarJSON.modules.base.files.unshift({src: zepto_path, global: true});

  thorax.writeFile(path.join('public', 'index.html'), thorax.template(path.join(__dirname, 'index.handlebars')));

  next();
};
