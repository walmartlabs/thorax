var http = require('http'),
    jsdom = require('jsdom'),
    fs = require('fs'),
    domToHtml = require('./domToHtml').domToHtml,
    path = require('path');



var options = {
  host: 'documentup.com',
  port: 80,
  path: '/walmartlabs/thorax'
};

http.get(options, function(response) {
  var output = '';
  response.on('data', function (chunk) {
    output += chunk;
  });
  response.on('end', function() {
    jsdom.env(output, [
      'http://code.jquery.com/jquery-1.5.min.js'
    ], function(errors, window) {
      //remove signatures from TOC
      window.$('#sections li a').each(function() {
        this.innerHTML = this.innerHTML.replace(/\*.+$/, '');
      });
      //make signatures nicer
      window.$('h3[id] em').each(function() {
        window.$(this).parent().addClass('signature');
      });
      //replace "overview" with "thorax"
      window.$(window.$('#content h2')[0]).after('<h1 id="title">Thorax</h1>').remove();
      //add github buttons
      window.$('#title').after('<iframe src="http://markdotto.github.com/github-buttons/github-btn.html?user=walmartlabs&repo=thorax&type=watch&count=false&size=large" allowtransparency="true" frameborder="0" scrolling="0" width="170px" height="30px"></iframe>');
      //needed styles
      window.$('head').append('<style>' + fs.readFileSync(path.join(__dirname, 'extra-styles.css')).toString() + '</style>');
      //remove appended jquery
      window.$('script').last().remove();
      var filename = path.join(__dirname, 'index.html');
      console.log('writing: ' + filename);
      fs.writeFileSync(filename, domToHtml(window.document, true));
    });
  });
});
