// Shamelessly pulled from Modernizr
// https://github.com/Modernizr/Modernizr/blob/master/test/js/server.js
var connect = require('connect'),
	args = process.argv.slice(2),
	folder = args[0] ? (process.cwd() + '/' + args[0]) : (__dirname + '/../../'),
	port = args[1] || '80';	

var server = connect.createServer(
    connect.static(folder)
).listen(port);

console.log("Server started on port %s in %s", port, folder);
