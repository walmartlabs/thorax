(function() {
  var root = this,
      Backbone = root.Backbone,
      Thorax = root.Thorax,
      _start = Backbone.History.prototype.start;

  Backbone.History.prototype.start = function() {
    //if this is a lumbar app, setup the module loader
    //this file must be included in the base module
    module.exports && module.exports.initBackboneLoader && module.exports.initBackboneLoader();
    return _start.apply(this, arguments);
  };

  Thorax.addModuleMethods = function(module) {
    var router;
    module.router = function(protoProps) {
      if (router || arguments.length === 0) {
        return router;
      }
      if (!router) {
        var klass = Thorax.Router.extend(_.extend({
          name: module.name,
          routes: module.routes
        }));
        return router = new klass;
      }
    };
  };

})();