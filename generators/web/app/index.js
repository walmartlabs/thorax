var path = require('path');

module.exports = function(thorax, next) {
  var jquery_path = path.join('app', 'lib', 'jquery.js');
  thorax.copy(path.join(__dirname, jquery_path), jquery_path);
  thorax.lumbarJSON.modules.base.files.unshift({src: jquery_path, global: true});

  thorax.lumbarJSON.platforms.push('web');
  thorax.lumbarJSON.packages[thorax.project] = {
    platforms: thorax.lumbarJSON.platforms,
    combine: false
  };

  thorax.writeFile(path.join('public', 'index.html'), thorax.template(path.join(__dirname, 'index.html.handlebars')));

  next();
};
