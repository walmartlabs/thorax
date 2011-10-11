var path = require('path');

module.exports = function(thorax, next) {
  var jquery_path = path.join('app', 'lib', 'jquery.js');
  thorax.copy(path.join(__dirname, jquery_path), jquery_path);
  thorax.lumbarJSON.modules.base.files.unshift({src: jquery_path, global: true});

  thorax.platform('web');
  thorax['package'](path.basename(thorax.target));

  thorax.writeFile(path.join('public', 'index.html'), thorax.render(path.join(__dirname, 'index.html.handlebars')));

  thorax.writeFile(path.join('app', 'init.js'), thorax.render(path.join(__dirname, 'init.js.handlebars')));

  next();
};
