(function() {
  // Allow for simple backbone event cleanup
  var inject = sinon.sandbox.inject;
  sinon.sandbox.inject = function(obj) {
    obj = inject.call(this, obj);

    obj.on = function(obj, event, callback) {
      var spy = this.spy(callback);
      spy.restore = function() {
        obj.off(event, spy);
      };
      obj.on(event, spy);
      return spy;
    };

    return obj;
  };
})();
