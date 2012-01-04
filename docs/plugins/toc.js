module.exports = function(static) {
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
