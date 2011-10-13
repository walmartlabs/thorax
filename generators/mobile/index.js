var path = require('path');

module.exports = function(thorax, next) {
  var zepto_path = path.join('app', 'lib', 'zepto.js');
  thorax.copy(path.join(__dirname, zepto_path), zepto_path);
  thorax.lumbarJSON.modules.base.files.unshift({
    src: zepto_path,
    global: true
  });

  var thorax_history_path = path.join('app', 'lib', 'thorax-history.js');
  thorax.copy(path.join(__dirname, thorax_history_path), thorax_history_path);
  thorax.lumbarJSON.modules.base.files.push({
    src: thorax_history_path,
    global: true
  });

  var remove_click_delay_path = path.join('app', 'lib', 'remove-click-delay.js');
  thorax.copy(path.join(__dirname, remove_click_delay_path), remove_click_delay_path);
  thorax.lumbarJSON.modules.base.files.push({
    src: remove_click_delay_path,
    global: true,
    platform: 'mobile'
  });

  thorax.platform('mobile');
  thorax['package'](path.basename(thorax.target));

  thorax.writeFile(path.join('public', 'index.html'), thorax.render(path.join(__dirname, 'index.html.handlebars')));

  thorax.writeFile(path.join('app', 'init.js'), thorax.render(path.join(__dirname, 'init.js.handlebars')));

  next();
};
