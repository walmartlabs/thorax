/*jshint node:true */
var FruitLoops = require('fruit-loops'),
    Mocha = require('mocha'),
    Sinon = require('sinon'),
    expect = require('expect.js'),
    path = require('path');

module.exports = function(grunt) {
  grunt.registerTask('fruit-loops:test', function() {
    var done = this.async();

    var _error = console.error;
    console.error = console.log;

    var page = FruitLoops.page({
      index: __dirname + '/../build/dev/fruit-loops/test.html',
      evil: true,

      resolver: function(href, window) {
        if (!/-server/.test(href)) {
          href = href.replace(/\.js$/, '-server.js');
        }
        return path.resolve(__dirname + '/../build/dev/fruit-loops/', href);
      },
      beforeExec: function(page, next) {
        page.window.Mocha = Mocha;
        page.window.mocha = createMocha(page.window);
        page.window.sinon = Sinon;
        page.window.expect = expect;

        // NOP emit so tests of that functionality don't cause early termination
        page.window.FruitLoops.emit = function() {};

        var grep = grunt.option('grep');
        if (grep) {
          page.window.mocha.grep(grep);
        }

        next();
      },
      callback: function(err, data) {
        console.error = _error;

        if (err) {
          done(err);
        } else if (!page.window.mochaResults) {
          done(new Error('Fruit Loops tests terminated early'));
        } else if (page.window.mochaResults.reports.length) {
          done(new Error(page.window.mochaResults.reports.length + ' failed tests'));
        } else {
          done();
        }
      }
    });
  });
};

function createMocha(global) {
  var mocha = new Mocha({reporter: 'dot'}),
      emit = global.FruitLoops.emit;

  /**
   * Override ui to ensure that the ui functions are initialized.
   * Normally this would happen in Mocha.prototype.loadFiles.
   */

  mocha.ui = function(ui){
    Mocha.prototype.ui.call(this, ui);
    this.suite.emit('pre-require', global, null, this);
    return this;
  };

  /**
   * Setup mocha with the given setting options.
   */

  mocha.setup = function(opts){
    if ('string' == typeof opts) {
      opts = { ui: opts };
    }
    for (var opt in opts) {
      this[opt](opts[opt]);
    }
    return this;
  };

  /**
   * Run mocha, returning the Runner.
   */

  mocha.run = function(fn){
    return Mocha.prototype.run.call(mocha, function() {
      // Have to manually emit as mocha will use the process async methods rather than the
      // window's so events emit will cause early termination.
      emit.call(FruitLoops);

      fn && fn();
    });
  };
  return mocha;
}
