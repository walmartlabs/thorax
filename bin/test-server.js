// Shamelessly pulled from Modernizr
// https://github.com/Modernizr/Modernizr/blob/master/test/js/server.js
var express = require('express'),
  path = require('path'),
  fs = require('fs'),
	args = process.argv.slice(2),
  root = path.join(__dirname, '..');
  folder = path.join(root, 'test'),
	port = args[1] || '80';	

var server = express.createServer();
server.use(express.static(folder));

function serveFile(file) {
  server.get('/' + file, function(request, response) {
    response.sendfile(path.join(root, file));
  });
}

fs.readdirSync(path.join(root, 'lib')).forEach(function(item) {
  serveFile(path.join('lib', item));
});

fs.readdirSync(path.join(root, 'dist')).forEach(function(item) {
  serveFile(path.join('dist', item));
});

server.listen(port);

console.log("Server started on port %s in %s", port, folder);
