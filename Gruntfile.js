module.exports = function(grunt) {
  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      files: [
        'src/**/*.js'
      ]
    },

    clean: ['build'],

    'phoenix-build': {
      dev: {
        options: {
          lumbarFile: 'build.json',
          build: true,
          output: 'build/dev'
        }
      }
    },

    connect: {
      server: {
        options: {
          base: 'build/dev',
          hostname: '*',
          port: 9999
        }
      }
    },

    'mocha_phantomjs': {
      quick: {
        options: {
          urls: [
            'http://localhost:9999/jquery/test.html',
            'http://localhost:9999/zepto/test.html'
          ]
        }
      },
      legacy: {
        options: {
          urls: [
            'http://localhost:9999/jquery-backbone-1-0/test.html',
            'http://localhost:9999/zepto-backbone-1-0/test.html'
          ]
        }
      }
    },

    watch: {
      scripts: {
        options: {
          atBegin: true
        },

        files: ['src/**/*.js', 'test/**/*.js'],
        tasks: ['jshint', 'phoenix-build:dev', 'mocha_phantomjs:quick']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-phantomjs');
  grunt.loadNpmTasks('phoenix-build');

  grunt.loadTasks('tasks');

  grunt.registerTask('test', ['clean', 'connect', 'jshint', 'phoenix-build', 'mocha_phantomjs']);
  grunt.registerTask('dev', ['clean', 'connect', 'watch']);
};
