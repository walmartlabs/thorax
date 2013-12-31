var fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    uglify = require('uglify-js'),
    targetDir = '../build/release',
    relativeTargetDir = 'build/release'; //for command line

try {
  fs.mkdirSync(path.join(__dirname, targetDir));
} catch(e) {
  /* NOP */
}

var config = {
  "thorax-combined.js": [
    'components/jquery/jquery.js',
    'components/handlebars/handlebars.js',
    'components/underscore/underscore.js',
    'components/backbone/backbone.js',
    'build/dev/thorax.js'
  ],
  "thorax-combined-mobile.js": [
    'components/zepto/zepto.js',
    'components/handlebars/handlebars.runtime.js',
    'components/underscore/underscore.js',
    'components/backbone/backbone.js',
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

function removeSourceMapUrl(source) {
  return source.replace(/\/\/@ sourceMappingURL\=thorax(\-mobile)?\.js\.map/, '');
}

module.exports = function(grunt) {
  grunt.registerTask('thorax:build', function() {
    var done = this.async();
    exec('jake lumbar', function(error, stdout, stderr) {
      error && process.stdout.write(error.toString());
      stdout && process.stdout.write(stdout);
      stderr && process.stdout.write(stderr);
      for (var target in config) {
        var fileList = config[target],
            output = '';
        fileList.forEach(function(file) {
          output += fs.readFileSync(path.join(__dirname, '..', file)).toString() + "\n";
        });
        if (!fs.existsSync(path.join(__dirname, targetDir))) {
          fs.mkdirSync(path.join(__dirname, targetDir));
        }
        var targetFile = path.join(__dirname, targetDir, target);
        fs.writeFileSync(targetFile.replace(/\.js$/, '.min.js'), minify(output));
        fs.writeFileSync(targetFile, output);
        console.log("Wrote: " + targetFile);
        console.log("Wrote: " + targetFile.replace(/\.js$/, '.min.js'));
      }
      var thoraxSrc = path.join(__dirname, '../build/dev/thorax.js'),
          thoraxMobileSrc = path.join(__dirname, '../build/dev/thorax-mobile.js'),
          thoraxDest = path.join(__dirname, targetDir, 'thorax.js'),
          thoraxMobileDest = path.join(__dirname, targetDir, 'thorax-mobile.js'),
          packageSrc = path.join(__dirname, '../package.json'),
          packageDest = path.join(relativeTargetDir, 'package.json'),
          composerSrc = path.join(__dirname, '../composer.json'),
          composerDest = path.join(relativeTargetDir, 'composer.json'),
          bowerSrc = path.join(__dirname, '../bower.json'),
          bowerDest = path.join(relativeTargetDir, 'bower.json');
      
      var copyCommand = 
        'cp ' + packageSrc + ' ' + packageDest + ';' +
        'cp ' + composerSrc + ' ' + composerDest + ';' +
        'cp ' + bowerSrc + ' ' + bowerDest + ';';

      exec(copyCommand, function(error, stdout, stderr) {
        error && process.stdout.write(error.toString());
        stdout && process.stdout.write(stdout);
        stderr && process.stdout.write(stderr);

        fs.writeFileSync(thoraxDest + '.map', fs.readFileSync(thoraxSrc + '.map').toString());
        fs.writeFileSync(thoraxMobileDest + '.map', fs.readFileSync(thoraxMobileSrc + '.map').toString());
        
        fs.writeFileSync(thoraxDest, removeSourceMapUrl(fs.readFileSync(thoraxSrc).toString()));
        fs.writeFileSync(thoraxMobileDest, removeSourceMapUrl(fs.readFileSync(thoraxMobileSrc).toString()));

        fs.writeFileSync(thoraxDest.replace(/\.js$/, '.min.js'), minify(fs.readFileSync(thoraxDest).toString()));
        fs.writeFileSync(thoraxMobileDest.replace(/\.js$/, '.min.js'), minify(fs.readFileSync(thoraxMobileDest).toString()));
        
        console.log("Wrote: " + thoraxDest + '.map');
        console.log("Wrote: " + thoraxMobileDest + '.map');
        console.log("Wrote: " + thoraxDest);
        console.log("Wrote: " + thoraxMobileDest);
        console.log("Wrote: " + thoraxDest.replace(/\.js$/, '.min.js'));
        console.log("Wrote: " + thoraxMobileDest.replace(/\.js$/, '.min.js'));
        done(true);
      });
    });
  });
};
