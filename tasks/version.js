var async = require('async'),
    git = require('./util/git'),
    semver = require('semver'),
    path = require('path');

module.exports = function(grunt) {
  grunt.registerTask('version', 'Updates component.json', function() {
    var done = this.async(),
        version = grunt.option('ver');

    if (!semver.valid(version)) {
      throw new Error('Must provide a version number (Ex: --ver=1.0.0):\n\t' + version + '\n\n');
    }

    grunt.log.writeln('Updating to version ' + version);

    async.series([
      function(next) {
        replace(path.join(__dirname, '../component.json'), /"version":.*/, '"version": "' + version + '",');
        git.add('component.json', next, path.join(__dirname, '..'));
      },
    ], done);
  
    function replace(path, regex, replace) {
      var content = grunt.file.read(path);
      content = content.replace(regex, replace);
      grunt.file.write(path, content);
    }

  });
};