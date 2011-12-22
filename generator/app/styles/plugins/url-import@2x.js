var stylus = require('stylus');

module.exports = exports = function() {
  return function(style) {
    style.define('url', stylus.url({res: 2}));
  };
};
