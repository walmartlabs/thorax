/*global sinon, QUnit, test*/
sinon.assert.fail = function (msg) {
    QUnit.ok(false, msg);
};

sinon.assert.pass = function (assertion) {
    QUnit.ok(true, assertion);
};

sinon.config = {
  injectIntoThis: true,
  injectInto: null,
  properties: ['spy', 'stub', 'mock', 'clock', 'sandbox', 'server', 'requests'],
  useFakeTimers: [10],
  useFakeServer: true
};

(function (global) {
  var module = QUnit.module;

  QUnit.module = function(moduleName, env) {
    var sandbox;

    module.call(this, moduleName, {
      setup: function() {
        var config = sinon.getConfig(sinon.config);
        config.injectInto = this;
        sandbox = sinon.sandbox.create(config);

        env && env.setup && env.setup.call(this);
      },
      teardown: function() {
        env && env.teardown && env.teardown.call(this);
        sandbox.verifyAndRestore();
      }
    });
  };

  // Make sure that we are seeded
  QUnit.module('', {});
}(this));
