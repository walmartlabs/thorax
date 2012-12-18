// Shamelessly pulled from Modernizr
// https://github.com/Modernizr/Modernizr/blob/master/test/js/server.js
var express = require('express'),
  path = require('path'),
  fs = require('fs'),
	args = process.argv.slice(2),
  root = path.join(__dirname, '..'),
  folder = path.join(root, 'build'),
	port = args[1] || '80';	

var server = express.createServer();
server.use(express.static(folder));

server.listen(port);

console.log("Server started on port %s in %s", port, folder);
