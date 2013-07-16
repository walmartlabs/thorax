module.exports = function(grunt) {
  grunt.loadTasks('tasks');
  grunt.loadNpmTasks('grunt-release-component');
  grunt.initConfig({
    'release-component': {
      options: {
        componentRepo: 'git@github.com:components/thorax.git',
        copy: {
          'build/release/thorax-combined.js': 'thorax-combined.js',
          'build/release/thorax-combined.min.js': 'thorax-combined.min.js',
          'build/release/thorax-combined-mobile.js': 'thorax-combined-mobile.js',
          'build/release/thorax-combined-mobile.min.js': 'thorax-combined-mobile.min.js',
          'build/release/thorax.js': 'thorax.js',
          'build/release/thorax-mobile.js': 'thorax-mobile.js',
          'build/release/thorax.min.js': 'thorax.min.js',
          'build/release/thorax-mobile.min.js': 'thorax-mobile.min.js'
        }
      }
    }
  });

  ['major', 'minor', 'patch'].forEach(function(type) {
    grunt.registerTask('thorax:release:' + type, ['thorax:build', 'release-component:' + type]);
  });
};