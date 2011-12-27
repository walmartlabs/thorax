var md = require("node-markdown").Markdown;
var fs = require('fs');
var jsdom = require('jsdom');

exports.generate = function(){
  var contents = fs.readFileSync(__dirname + '/template.html').toString();

  var css = fs.readFileSync(__dirname + '/style.css');
  var main_html = md(fs.readFileSync(__dirname + '/README.md').toString());

  contents = contents.replace('<!-- style.css -->', css);
  contents = contents.replace('<!-- README.md -->', main_html);

  jsdom.env(contents, [
    'http://code.jquery.com/jquery-1.5.min.js'
  ],function(errors, window) {
    //assign ids
    window.$('.container h2').each(function() {
      this.id = this.innerHTML.split(/\s/).shift().replace(/\./g,'-').toLowerCase();
    });
    window.$('.container h3').each(function(){
      var name = this.innerHTML.split(/\s/).shift();
      var header = window.$(this).prevAll('h2:first')[0];
      this.id = (header.innerHTML.replace(/\./g,'-') + '-' + name).toLowerCase();
    });
    
    //build toc
    var toc_html = '';
    window.$('.container h2').each(function(){
      toc_html += '<h2><a href="#' + this.id + '">' + this.innerHTML + '</a></h2>';
      var signatures = window.$(this).nextUntil('h2').filter('h3');
      if (signatures.length) {
        toc_html += '<ul>';
        signatures.each(function(){
          toc_html += '<li><a href="#' + this.id + '">' + this.innerHTML.split(/\s/).shift() + '</a></li>'
        });
        toc_html += '</ul>';
      }
    });
    window.$('#sidebar').html(toc_html);
    fs.writeFileSync(__dirname + '/index.html', "<!DOCTYPE HTML>\n<html>\n" + window.document.documentElement.innerHTML + "</html>");
  });
};
