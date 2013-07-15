var fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    uglify = require('uglify-js'),
    semver = require('semver'),
    async = require('async'),
    targetDir = '../build/release';

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

function modifyBowerJSON(bowerJSONPath, callback) {
  var bowerJSON = JSON.parse(fs.readFileSync(bowerJSONPath).toString());
  callback(bowerJSON);
  fs.writeFileSync(bowerJSONPath, JSON.stringify(bowerJSON, null, 2));
}

function generateExec(string) {
  return function(callback) {
    exec(string, callback);
  }
}

module.exports = function(grunt) {
  var repoRoot = path.join(__dirname, '..'),
      tmpRepoRoot = path.join(repoRoot, 'tmp-component-repo');
  grunt.registerTask('thorax:bower-release', function(type) {
    modifyBowerJSON(path.join(__dirname, '..', 'bower.json'), function(bowerJSON) {
      bowerJSON.version = semver.inc(bowerJSON.version, type);
      console.log('bower version now at ' + bowerJSON.version);
      async.series([
        generateExec('git add ' + path.join(repoRoot, 'bower.json') + '; git commit -m "Update bower version to ' + bowerJSON.version + '";'),
        generateExec('git clone git@github.com:components/thorax.git ' + tmpRepoRoot);
        generateExec('cp ' + path.join(repoRoot, 'build/dev/thorax.js') + ' ' + path.join(tmpRepoRoot, 'thorax.js')),
        generateExec('cp ' + path.join(repoRoot, 'build/dev/thorax-mobile.js') + ' ' + path.join(tmpRepoRoot, 'thorax-mobile.js')),
        function(callback) {
          modifyBowerJSON(path.join(tmpRepoRoot, 'bower.json'), function(bowerJSON) {
            bowerJSON.version = semver.inc(bowerJSON.version, type);
            callback();
          });
        },
        generateExec('git add ' + path.join(tmpRepoRoot, 'bower.json')),
        generateExec('cd ' + tmpRepoRoot + '; git commit -m "Update to ' + bowerJSON.version + '"'),
        generateExec('cd ' + tmpRepoRoot + '; git push origin master'),
        generateExec('cd ' + tmpRepoRoot + '; git push origin master'),
        generateExec('cd ' + tmpRepoRoot + '; git tag ' + bowerJSON.version + ' -m "release ' + bowerJSON.version + '"'),
        generateExec('cd ' + tmpRepoRoot + '; git push --tags'),
        generateExec('rm -rf ' + tmpRepoRoot)
      ]);
    });
  });

  grunt.registerTask('thorax:build', function(type) {
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
          thoraxMobileDest = path.join(__dirname, targetDir, 'thorax-mobile.js');
      var copyCommand = 
        'cp ' + thoraxSrc + ' ' + thoraxDest + ';' +
        'cp ' + thoraxMobileSrc + ' ' + thoraxMobileDest + ';';
      exec(copyCommand, function(error, stdout, stderr) {
        error && process.stdout.write(error.toString());
        stdout && process.stdout.write(stdout);
        stderr && process.stdout.write(stderr);
        fs.writeFileSync(thoraxDest.replace(/\.js$/, '.min.js'), minify(fs.readFileSync(thoraxDest).toString()));
        fs.writeFileSync(thoraxMobileDest.replace(/\.js$/, '.min.js'), minify(fs.readFileSync(thoraxMobileDest).toString()));
        console.log("Wrote: " + thoraxDest);
        console.log("Wrote: " + thoraxMobileDest);
        console.log("Wrote: " + thoraxDest.replace(/\.js$/, '.min.js'));
        console.log("Wrote: " + thoraxMobileDest.replace(/\.js$/, '.min.js'));
        done(true);
      });
    });
  });
};
