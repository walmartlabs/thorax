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
      options: {
        reporter: 'dot'
      },
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

    'saucelabs-mocha': {
      options: {
        testname: 'thorax',
        build: process.env.TRAVIS_JOB_ID,
        detailedError: true,
        concurrency: 4
      },
      jquery: {
        options: {
          tags: ['jquery'],
          urls: [
            'http://localhost:9999/jquery/test.html',
            'http://localhost:9999/jquery-backbone-1-0/test.html'
          ],
          browsers: [
            {browserName: 'chrome'},
            {browserName: 'firefox'},
            {browserName: 'safari', version: 7, platform: 'OS X 10.9'},
            {browserName: 'internet explorer', version: 11, platform: 'Windows 8.1'},
            {browserName: 'internet explorer', version: 9, platform: 'Windows 7'}
          ]
        }
      },
      zepto: {
        options: {
          tags: ['zepto'],
          urls: [
            'http://localhost:9999/zepto/test.html',
            'http://localhost:9999/zepto-backbone-1-0/test.html'
          ],
          browsers: [
            {browserName: 'chrome'},
            {browserName: 'firefox'},
            {browserName: 'safari', version: 7, platform: 'OS X 10.9'},
            {browserName: 'internet explorer', version: 11, platform: 'Windows 8.1'},
            {browserName: 'internet explorer', version: 10, platform: 'Windows 8'},
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
  grunt.loadNpmTasks('grunt-saucelabs');
  grunt.loadNpmTasks('phoenix-build');

  grunt.loadTasks('tasks');


  grunt.registerTask('sauce', process.env.SAUCE_USERNAME ? ['saucelabs-mocha:zepto', 'saucelabs-mocha:jquery'] : []);

  grunt.registerTask('test', ['clean', 'connect', 'jshint', 'phoenix-build', 'mocha_phantomjs', 'sauce']);
  grunt.registerTask('dev', ['clean', 'connect', 'watch']);
};
