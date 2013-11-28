var async = require('async'),
    git = require('./util/git'),
    semver = require('semver'),
    path = require('path');

module.exports = function(grunt) {
  grunt.registerTask('thorax:component-version', 'Updates the current release version for cdnjs/cdnjs and components/thorax', function() {
    var done = this.async(),
        version = grunt.option('ver'),
        cdnjsLocation = grunt.option('cdnjs'),
        componentLocation = grunt.option('component');

    if (!cdnjsLocation) {
      throw new Error('Must provide a cdnjs repo location (Ex: --cdnjs=../cdnjs):\n\t' + version + '\n\n');
    }

    if (!componentLocation) {
      throw new Error('Must provide a component repo location (Ex: --component=../components/thorax):\n\t' + version + '\n\n');
    }

    if (!semver.valid(version)) {
      throw new Error('Must provide a version number (Ex: --ver=1.0.0):\n\t' + version + '\n\n');
    }

    grunt.log.writeln('Updating to version ' + version);

    async.each([
        [path.join(componentLocation, 'bower.json'), /"version":.*/, '"version": "' + version + '",'],
        [path.join(componentLocation, 'component.json'), /"version":.*/, '"version": "' + version + '",'],
        [path.join(cdnjsLocation, 'ajax/libs/thorax/package.json'), /"version":.*/, '"version": "' + version + '",']
      ],
      function(args, callback) {
        replace.apply(undefined, args);
        grunt.log.writeln('    - ' + args[0]);
        git.add(args[0], callback);
      },
      function() {
        done();
      });
  });

  function replace(path, regex, replace) {
    var content = grunt.file.read(path);
    content = content.replace(regex, replace);
    grunt.file.write(path, content);
  }
};