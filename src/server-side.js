/*global $serverSide, FruitLoops */

// Override uniqueId to ensure uniqueness across both the server and client
// rendering cycles
var _idCounter = window._idCounter || 0,
    _reqId = '';
window._resetIdCounter = function(reqId) {
  _idCounter = 0;
  _reqId = reqId || '';
};

_.uniqueId = function(prefix) {
  var id = _reqId + (++_idCounter);
  return prefix ? prefix + id : id;
};

if (window.$serverSide) {
  FruitLoops.onEmit(function() {
    $('body').append('<script>window._idCounter = ' + _idCounter + ';</script>');
  });
}
