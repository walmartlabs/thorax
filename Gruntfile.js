module.exports = function(grunt) {
  grunt.loadTasks('tasks');
  grunt.loadNpmTasks('grunt-release');
  ['major', 'minor', 'patch', 'prerelease'].forEach(function(type) {
    grunt.registerTask('thorax:release:' + type, ['thorax:build', 'release:' + type, 'thorax:bower-release:' + type]);
  });
};