module.exports = function(grunt) {
  grunt.loadTasks('tasks');

  grunt.initConfig({
    thorax: {
      templates: {
        source: '../thorax-boilerplate/release/lumbar/templates/',
        target: '../thorax-boilerplate/release/lumbar/templates.js',
        applicationName: 'Application'
      }
    }
  });

  grunt.registerTask('default', ['thorax:release']);
};