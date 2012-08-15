(function() {
  
  var root = this,
      Backbone = root.Backbone,
      Thorax = root.Thorax,
      _ = root._,
      $ = root.$,
      _extend = Thorax.View.prototype.extend,
      _configure = Thorax.View.prototype._configure;

  Thorax.View.extend = function() {
    var child = _extend.apply(this, arguments);
    child.mixins = _.clone(this.mixins);
    return child;
  };

  Thorax.View.prototype.configure = function() {
    _configure.apply(this, arguments);
    
    //mixins
    for (var i = 0; i < this.constructor.mixins.length; ++i) {
      applyMixin.call(this, this.constructor.mixins[i]);
    }
    if (this.mixins) {
      for (var i = 0; i < this.mixins.length; ++i) {
        applyMixin.call(this, this.mixins[i]);
      }
    }
  };

  _.extend(Thorax.View, {
    mixins: [],
    mixin: function(mixin) {
      this.mixins.push(mixin);
    }
  });

  function applyMixin(mixin) {
    if (_.isArray(mixin)) {
      this.mixin.apply(this, mixin);
    } else {
      this.mixin(mixin);
    }
  }

})();