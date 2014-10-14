var fs = require('fs');
var path = require('path');

var Benchmark = require('benchmark'),
    FruitLoops = require('fruit-loops');

var filterRe = /./;

var Suites = module.exports = function() {};

Suites.prototype.filter = function(str) {
  filterRe = new RegExp(str, 'i');
};

Suites.prototype.add = function(name, options) {
  var markup, suite, testFn;
  if (!filterRe.test(name)) {
    return;
  }
  suite = new Benchmark.Suite(name);
  testFn = options.test;

  suite.on('start', function(event) {
    console.log('Test: ' + name);
  });
  suite.on('cycle', function(event) {
    if (event.target.error) {
      return;
    }
    console.log('\t' + String(event.target));
  });
  suite.on('error', function(event) {
    console.log('*** Error in ' + event.target.name + ': ***');
    console.log('\t' + event.target.error.stack);
    console.log('*** Test invalidated. ***');
  });

  this._bench(suite, options);
};

Suites.prototype._bench = function(suite, options) {
  var page = FruitLoops.page({
    index: __dirname + '/../build/dev/fruit-loops/bench.html',
    evil: true,

    resolver: function(href, window) {
      if (!/-server/.test(href)) {
        href = href.replace(/\.js$/, '-server.js');
      }
      return path.resolve(__dirname + '/../build/dev/fruit-loops/', href);
    },
    beforeExec: function(page, next) {
      // Prevent tests from causing an emit to occur
      page.window.FruitLoops.emit = function() {};
      next();
    },
    loaded: function(page) {
      var test = '';
      if (options.setup) {
        test = options.setup.toString().replace(/^function\s*\(\)\s*\{([\s\S]+)\}$/, '$1');
      }
      test += 'window.testFn = ' + options.test + ';';

      page.runScript(test, function(err) {
        if (err) {
          throw err;
        }

        setImmediate(function() {
          global.testFn = page.window.testFn;
          suite.run();
        });
      });
    }
  });

  function exec() {
    testFn();
  }

  var testFn;
  suite.add('thorax', function() {
    testFn();
  });
};
