var path = require('path');

module.exports = function(thorax) {
  thorax.addFile(path.join(__dirname, 'app', 'lib', 'jquery'));

  thorax.lumbarJSON(function(json) {
    json.platforms.push('web');
    json.packages.web = {
      platforms: ['web'],
      combine: false,
      modules: ['base', 'home']
    };
    return json;
  });
};
