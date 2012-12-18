/*global chai, mocha, mochaPhantomJS */
mocha.setup({
  ui: 'bdd',
  globals: ['addEventListener', 'removeEventListener']
});

window.expect = chai.expect;

sinon.config = {
  injectIntoThis: true,
  injectInto: null,
  properties: ['spy', 'stub', 'mock', 'clock', 'sandbox', 'server', 'requests', 'on'],
  useFakeTimers: [10],
  useFakeServer: true
};

beforeEach(function() {
  var config = sinon.getConfig(sinon.config);
  config.injectInto = this;
  this.sandbox = sinon.sandbox.create(config);
});
afterEach(function() {
  this.clock.tick(1000);
  this.sandbox.verifyAndRestore();
});

$(document).ready(function() {
  if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
  } else {
    mocha.run();
  }
});
