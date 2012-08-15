(function() {

  var root = this,
      Backbone = root.Backbone,
      Handlebars = root.Handlebars,
      Thorax = root.Thorax,
      _ = root._,
      $ = root.$,
      modelCidAttributeName = 'data-model-cid',
      modelNameAttributeName = 'data-model-name',
      _freeze = Thorax.View.prototype.freeze,
      _context = Thorax.View.prototype.context,
      _extend = Thorax.View.extend;

  Thorax.Model = Backbone.Model.extend({
    isEmpty: function() {
      return this.isPopulated();
    },
    isPopulated: function() {
      // We are populated if we have attributes set
      var attributes = _.clone(this.attributes);
      var defaults = _.isFunction(this.defaults) ? this.defaults() : (this.defaults || {});
      for (var default_key in defaults) {
        if (attributes[default_key] != defaults[default_key]) {
          return true;
        }
        delete attributes[default_key];
      }
      var keys = _.keys(attributes);
      return keys.length > 1 || (keys.length === 1 && keys[0] !== 'id');
    }
  });

  Thorax.Util.createRegistry(Thorax, '_models', 'model', 'Model');

  Thorax.Util.extendConstructor(Thorax, 'View', function($super, options) {
    $super.call(this, options);
    if (this.model) {
      //need to null this.model so setModel will not treat
      //it as the old model and immediately return
      var model = this.model;
      this.model = null;
      this.setModel(model);
    }
  });

  _.extend(Thorax.View, {
    extend: function() {
      var child = _extend.apply(this, arguments);
      Thorax.Util._cloneEvents(this, child, '_modelEvents');
      return child;
    },
    _modelEvents: [],
    on: generateOnWrapper(Thorax.View.on)
  });

  function addEvents(target, source) {
    _.each(source, function(callback, eventName) {
      if (_.isArray(callback)) {
        callback.forEach(function(cb) {
          target.push([eventName, cb]);
        }, this);
      } else {
        target.push([eventName, callback]);
      }
    });
  }

  function generateOnWrapper(parent) {
    return function(eventName, callback) {
      if (eventName === 'model' && typeof callback === 'object') {
        if (!this._modelEvents) {
          this._modelEvents = [];
        }
        addEvents(this._modelEvents, callback);
      } else {
        return parent.apply(this, arguments);
      }
    }
  }

  _.extend(Thorax.View.prototype, {
    on: generateOnWrapper(Thorax.View.prototype.on),
    _getContext: function(attributes) {
      return _.extend({}, Thorax.Util.getValue(this, 'context', this.model), attributes || {}, {
        cid: _.uniqueId('t'),
        _view: this
      });
    },
    context: function() {
      return _.extend({}, _context.call(this), (this.model && this.model.attributes) || {});
    },
    freeze: function(options) {
      this.model && this._unbindModelEvents();
      _freeze.call(this, options);
    },
    _bindModelEvents: function() {
      bindModelEvents.call(this, this.constructor._modelEvents);
      bindModelEvents.call(this, this._modelEvents);
    },
    _unbindModelEvents: function() {
      this.model.trigger('freeze');
      unbindModelEvents.call(this, this.constructor._modelEvents);
      unbindModelEvents.call(this, this._modelEvents);
    },
    setModel: function(model, options) {
      if (!this._modelEvents) {
        this._modelEvents = [];
      }
      var oldModel = this.model;
      if (model === oldModel) {
        return this;
      }
      oldModel && this._unbindModelEvents();
      if (model) {
        this.$el.attr(modelCidAttributeName, model.cid);
        if (model.name) {
          this.$el.attr(modelNameAttributeName, model.name);
        }
        this.model = model;
        this._setModelOptions(options);
        this._bindModelEvents(options);
        this.model.trigger('set', this.model, oldModel);
        if (Thorax.Util.shouldFetch(this.model, this._modelOptions)) {
          var success = this._modelOptions.success;
          this._loadModel(this.model, this._modelOptions);
        } else {
          //want to trigger built in event handler (render() + populate())
          //without triggering event on model
          this._onModelChange();
        }
      } else {
        this._modelOptions = false;
        this.model = false;
        this._onModelChange();
        this.$el.removeAttr(modelCidAttributeName);
        this.$el.attr(modelNameAttributeName);
      }
      return this;
    },
    _onModelChange: function() {
      if (!this._modelOptions || (this._modelOptions && this._modelOptions.render)) {
        this.render();
      }
    },
    _loadModel: function(model, options) {
      model.fetch(options);
    },
    _setModelOptions: function(options) {
      if (!this._modelOptions) {
        this._modelOptions = {
          fetch: true,
          success: false,
          render: true,
          errors: true
        };
      }
      _.extend(this._modelOptions, options || {});
      return this._modelOptions;
    }
  });

  function bindModelEvents(events) {
    events.forEach(function(event) {
      this.model.on(event[0], event[1], event[2] || this);
    }, this);
  }

  function unbindModelEvents(events) {
    events.forEach(function(event) {
      this.model.off(event[0], event[1], event[2] || this);
    }, this);
  }

  Thorax.View.on({
    model: {
      error: function(model, errors){
        if (this._modelOptions.errors) {
          this.trigger('error', errors);
        }
      },
      change: function() {
        this._onModelChange();
      }
    }
  });

  Thorax.Util.shouldFetch = function(modelOrCollection, options) {
    var getValue = Thorax.Util.getValue;
    var url = (
      (!modelOrCollection.collection && getValue(modelOrCollection, 'urlRoot')) ||
      (modelOrCollection.collection && getValue(modelOrCollection.collection, 'url')) ||
      (!modelOrCollection.collection && modelOrCollection._byCid && modelOrCollection._byId && getValue(modelOrCollection, 'url'))
    );
    return url && options.fetch && (
      typeof modelOrCollection.isPopulated === 'undefined' || !modelOrCollection.isPopulated()
    );
  };

  $.fn.model = function() {
    var $this = $(this),
        modelElement = $this.closest('[' + modelCidAttributeName + ']'),
        modelCid = modelElement && modelElement.attr(modelCidAttributeName);
    if (modelCid) {
      var view = $this.view();
      if (view && view.model && view.model.cid === modelCid) {
        return view.model || false;
      }
      var collection = $this.collection(view);
      if (collection) {
        return collection._byCid[modelCid] || false;
      }
    }
    return false;
  };

})();