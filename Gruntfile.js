module.exports = function(grunt) {
  var grep = grunt.option('grep'),
      mochaArgs = grep ? '?grep=' + grep : '';

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
          output: 'build/dev',
          sourceMap: true
        }
      }
    },

    connect: {
      server: {
        options: {
          base: 'build/dev',
          hostname: '*',
          port: 9998
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
            'http://localhost:9998/jquery/test.html' + mochaArgs,
            'http://localhost:9998/zepto/test.html' + mochaArgs
          ]
        }
      },
      legacy: {
        options: {
          urls: [
            'http://localhost:9998/jquery-backbone-1-0/test.html' + mochaArgs,
            'http://localhost:9998/zepto-backbone-1-0/test.html' + mochaArgs
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
            'http://localhost:9998/jquery/test.html',
            'http://localhost:9998/jquery-backbone-1-0/test.html'
          ],
          browsers: [
            {browserName: 'chrome'},
            {browserName: 'firefox'},
            {browserName: 'safari', version: 7, platform: 'OS X 10.9'},
            {browserName: 'internet explorer', version: 11, platform: 'Windows 8.1'},
            {browserName: 'internet explorer', version: 8, platform: 'XP'}
          ]
        }
      },
      zepto: {
        options: {
          tags: ['zepto'],
          urls: [
            'http://localhost:9998/zepto/test.html'
          ],
          browsers: [
            {browserName: 'chrome'},
            {browserName: 'firefox'},
            {browserName: 'internet explorer', version: 11, platform: 'Windows 8.1'}
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
        tasks: ['jshint', 'phoenix-build:dev', 'mocha_phantomjs:quick', 'fruit-loops:test']
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

  grunt.registerTask('test', ['clean', 'connect', 'jshint', 'phoenix-build', 'fruit-loops:test', 'mocha_phantomjs', 'sauce']);
  grunt.registerTask('dev', ['clean', 'connect', 'watch']);
};
