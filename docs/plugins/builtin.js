var path = require('path');

module.exports = function(static) {
  //copy assets to assets folder in target
  static.file(/^assets\//, function(file) {
    file.write('assets');
  });

  //copy scripts to scripts folder in target
  static.file(/^scripts\//, function(file) {
    file.write('scripts');
  });

  //copy styles to styles folder in target
  static.file(/^styles\//, function(file) {
    file.write('styles');
  });

  //copy pages to root
  static.file(/^pages\//, function(file) {
    //create an array of all scripts and styles for handlebars
    //helpers of the same names, include socket.io first, only
    //used for live reload functionality
    file.scripts = static.readdir('scripts');
    file.styles = static.readdir('styles');

    //add package.json values to scope of file
    for (var key in static.package) {
      file.set(key, static.package[key]);
    }

    //set the name of the folder the file is in
    file.set('folder', path.dirname(file.source));

    //save to root of target directory
    file.write('.');
  });

  //process markdown files with handlebars then markdown
  static.file(/\.(md|markdown)$/, function(file) {
    file.transform('markdown');
    file.changeExtensionTo('html');
    file.$(function(window) {
      window.$('code').remove();
    });
  });

  //process handlebars files with handlebars
  static.file(/\.handlebars$/, function(file) {
    file.transform('handlebars');
    file.changeExtensionTo('html');
  });

  //process stylus files with stylus
  static.file(/\.styl$/, function(file) {
    file.transform('stylus');
    file.changeExtensionTo('css');
  });

};
