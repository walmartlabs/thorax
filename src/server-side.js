/*global $serverSide, onEmit */

// Override uniqueId to ensure uniqueness across both the server and client
// rendering cycles
window._idCounter = window._idCounter || 0;

_.uniqueId = function(prefix) {
  var id = (window._reqId || '') + (++window._idCounter);
  return prefix ? prefix + id : id;
};

if (window.$serverSide) {
  onEmit(function() {
    $('body').append('<script>window._idCounter = ' + window._idCounter + ';</script>');
  });
}
