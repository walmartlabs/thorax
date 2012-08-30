var modelCidAttributeName = 'data-model-cid',
    modelNameAttributeName = 'data-model-name',
    _freeze = Thorax.View.prototype.freeze,
    _context = Thorax.View.prototype.context;

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

Thorax.Models = {};
Thorax.Util.createRegistryWrapper(Thorax.Model, Thorax.Models);

{{#inject "constructor"}}
  if (this.model) {
    //need to null this.model so setModel will not treat
    //it as the old model and immediately return
    var model = this.model;
    this.model = null;
    this.setModel(model);
  }
{{/inject}}

{{#inject "configure"}}
  this._modelEvents = [];
{{/inject}}

{{#inject "extend"}}
  Thorax.Util._cloneEvents(this, child, '_modelEvents');
{{/inject}}

{{#inject "on"}}
  if (eventName === 'model' && typeof callback === 'object') {
    return addEvents(this._modelEvents, callback);
  }
{{/inject}}

Thorax.View._modelEvents = [];

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

_.extend(Thorax.View.prototype, {
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
  var getValue = Thorax.Util.getValue,
      isCollection = !modelOrCollection.collection && modelOrCollection._byCid && modelOrCollection._byId;
      url = (
        (!modelOrCollection.collection && getValue(modelOrCollection, 'urlRoot')) ||
        (modelOrCollection.collection && getValue(modelOrCollection.collection, 'url')) ||
        (isCollection && getValue(modelOrCollection, 'url'))
      );
  return url && options.fetch && !(
    (modelOrCollection.isPopulated && modelOrCollection.isPopulated()) ||
    (isCollection
      ? Thorax.Collection && Thorax.Collection.prototype.isPopulated.call(modelOrCollection)
      : Thorax.Model.prototype.isPopulated.call(modelOrCollection)
    )
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
