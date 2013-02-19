module.exports = function(grunt) {
  grunt.loadTasks('tasks');

  grunt.registerTask('default', ['thorax:release']);
};