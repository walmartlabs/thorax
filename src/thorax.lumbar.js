(function() {
  var root = this,
      Backbone = root.Backbone,
      Thorax = root.Thorax,
      _start = Backbone.History.prototype.start;

  Backbone.History.prototype.start = function() {
    //if this is a lumbar app, setup the module loader
    this.initBackboneLoader && this.initBackboneLoader();
    return _start.apply(this, arguments);
  };

  Thorax.addModuleMethods = function(module) {
    module.router = function(protoProps) {
      var router = Thorax.router(module.name, null, true);
      if (arguments.length === 0) {
        return router;
      }
      if (!router) {
        if (protoProps.prototype) {
          protoProps.prototype.name = module.name;
          protoProps.prototype.routes = module.routes;
          protoProps = new protoProps;
        } else {
          protoProps.name = module.name;
          protoProps.routes = module.routes;
        }
        return new Thorax.router(module.name, protoProps);
      } else {
        _.extend(router, protoProps);
        return router;
      }
    };
  };


})();