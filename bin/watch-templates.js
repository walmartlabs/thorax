var fs = require('fs'),
    path = require('path'),
    timeout,
    watchTree = require('fs-watch-tree').watchTree;

module.exports = function(templatesDir, outputFile, applicationName) {
  console.log('Watching ' + templatesDir + ' for changes');
  watchTree(templatesDir, function() {
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      compileTemplates(templatesDir, outputFile, applicationName);
    }, 250);
  });
  compileTemplates(templatesDir, outputFile, applicationName);
};

function compileTemplates(templatesDir, outputFile, applicationName) {
  var target = path.join(process.cwd(), templatesDir);
  readDir(target, function(err, results) {
    if (err) {
      throw err;
    }
    var filenames = results.filter(function(name) {
      return name.match(/\.handlebars$/);
    }).map(function(name) {
      return name.substr(target.length, name.length).replace(/^\//, '');
    });
    var output = filenames.map(function(filename) {
      var content = fs.readFileSync(path.join(target, filename)).toString();
      content = addslashes(content).replace(/(\r\n|\n|\r)/gm, "\\n");
      return (applicationName || 'Thorax') + '.templates["' + filename.replace(/\.[a-zA-Z0-9]+$/, '') + '"] = "' + content + '";\n';
    }).join('');
    fs.writeFileSync(outputFile, output);
    console.log('Inlined templates from ' + templatesDir + ' into ' + outputFile);
  });
}

function readDir(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          readDir(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
}

function addslashes(string) {
  return string.replace(/\\/g, '\\\\').
    replace(/\u0008/g, '\\b').
    replace(/\t/g, '\\t').
    replace(/\n/g, '\\n').
    replace(/\f/g, '\\f').
    replace(/\r/g, '\\r').
    replace(/'/g, '\\\'').
    replace(/"/g, '\\"');
}