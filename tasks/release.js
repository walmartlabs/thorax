var fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    uglify = require('uglify-js'),
    targetDir = '../build/release';

try {
  fs.mkdirSync(path.join(__dirname, targetDir));
} catch(e) {
  
}

var config = {
  "thorax.js": [
    'lib/jquery.js',
    'lib/handlebars.js',
    'lib/underscore.js',
    'lib/backbone.js',
    'build/dev/thorax.js'
  ],
  "thorax-mobile.js": [
    'lib/zepto.js',
    'lib/handlebars.js',
    'lib/underscore.js',
    'lib/backbone.js',
    'build/dev/thorax-mobile.js'
  ]
};

function minify(code) {
  var jsp = uglify.parser,
      pro = uglify.uglify,
      ast = jsp.parse(code);
  ast = pro.ast_mangle(ast);
  ast = pro.ast_squeeze(ast);
  return pro.gen_code(ast);
}

module.exports = function(grunt) {
  grunt.registerTask('thorax:release', function() {
    var done = this.async();
    exec('jake lumbar', function(error, stdout, stderr) {
      error && process.stdout.write(error);
      stdout && process.stdout.write(stdout);
      stderr && process.stdout.write(stderr);
  
      for (var target in config) {
        var fileList = config[target],
            output = '';
        fileList.forEach(function(file) {
          output += fs.readFileSync(path.join(__dirname, '..', file)).toString() + "\n";
        });
        var targetFile = path.join(__dirname, targetDir, target);
        fs.writeFileSync(targetFile.replace(/\.js$/, '.min.js'), minify(output));
        fs.writeFileSync(targetFile, output);
        console.log("Wrote: " + targetFile);
        console.log("Wrote: " + targetFile.replace(/\.js$/, '.min.js'));
      }
      done(true);
    });
  });
};