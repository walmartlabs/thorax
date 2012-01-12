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

  static.file('index.handlebars', function(file) {
    file.$(function(window) {
      //assign ids
      window.$('.container h2').each(function() {
        this.id = this.innerHTML.split(/\s/).shift().replace(/\./g,'-').toLowerCase();
      });
      window.$('.container h3').each(function() {
        var name = this.innerHTML.split(/\s/).shift();
        var header = window.$(this).prevAll('h2:first')[0];
        this.id = (header.innerHTML.replace(/\./g,'-') + '-' + name).toLowerCase();
      });
      
      //build toc
      var toc_html = '';
      window.$('.container h2').each(function() {
        toc_html += '<h2><a href="#' + this.id + '">' + this.innerHTML + '</a></h2>';
        var signatures = window.$(this).nextUntil('h2').filter('h3');
        if (signatures.length) {
          toc_html += '<ul>';
          signatures.each(function(){
            toc_html += '<li><a href="#' + this.id + '">' + this.innerHTML.split(/\</).shift() + '</a></li>'
          });
          toc_html += '</ul>';
        }
      });

      //append toc
      window.$('#sidebar').html(toc_html);
    });
  });

};
