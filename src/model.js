var modelCidAttributeName = 'data-model-cid',
    modelNameAttributeName = 'data-model-name';

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

{{#inject "beforeConfigure"}}
  this._modelOptionsByCid = {};
  this._modelEvents = [];
  this._models = [];
{{/inject}}

{{#inject "extend"}}
  Thorax.Util._cloneEvents(this, child, '_modelEvents');
{{/inject}}

{{#inject "on"}}
  if (eventName === 'model' && typeof callback === 'object') {
    return addEvents(this._modelEvents, callback);
  }
{{/inject}}

{{#inject "freeze"}}
  _.each(this._models, this.removeModel, this);
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
  context: function() {
    return _.extend({}, this, (this.model && this.model.attributes) || {});
  },
  _bindModelEvents: function(model) {
    bindModelEvents.call(this, model, this.constructor._modelEvents);
    bindModelEvents.call(this, model, this._modelEvents);
  },
  _unbindModelEvents: function(model) {
    model.trigger('freeze');
    unbindModelEvents.call(this, model, this.constructor._modelEvents);
    unbindModelEvents.call(this, model, this._modelEvents);
  },
  addModel: function(model, options) {
    var modelOptions = this._setModelOptions(model, options);
    this._bindModelEvents(model, modelOptions);
    if (Thorax.Util.shouldFetch(this.model, modelOptions)) {
      var success = modelOptions.success;
      this._loadModel(this.model, modelOptions);
    } else {
      //want to trigger built in event handler (render() + populate())
      //without triggering event on model
      this._onModelChange(model);
    }
  },
  removeModel: function(model) {
    this._models = _.without(this._models, model);
    this._unbindModelEvents(model);
    delete this._modelOptionsByCid[model.cid];
  },
  setModel: function(model, options) {
    var oldModel = this.model;
    if (model === oldModel) {
      return this;
    }
    if (oldModel) {
      this.removeModel(oldModel);
    }
    if (model) {
      this.$el.attr(modelCidAttributeName, model.cid);
      model.name && this.$el.attr(modelNameAttributeName, model.name);
      this.model = model;
      this.addModel(model, options);
      this.model.trigger('set', this.model, oldModel);
    } else {
      this.model = false;
      this._onModelChange(false);
      this.$el.removeAttr(modelCidAttributeName);
      this.$el.attr(modelNameAttributeName);
    }
    return this;
  },
  _onModelChange: function(model) {
    var modelOptions = model && this._modelOptionsByCid[model.cid];
    // !this._modelOptions will be true when setModel(false) is called
    if (!modelOptions || (modelOptions && modelOptions.render)) {
      this.render();
    }
    {{{override "model-change" indent=4}}}
  },
  _loadModel: function(model, options) {
    model.fetch(options);
  },
  _setModelOptions: function(model, options) {
    if (!this._modelOptionsByCid[model.cid]) {
      this._modelOptionsByCid[model.cid] = {
        fetch: true,
        success: false,
        render: true,
        errors: true
        {{{override "model-options" indent=8}}}
      };
    }
    _.extend(this._modelOptionsByCid[model.cid], options || {});
    return this._modelOptionsByCid[model.cid];
  }
});

function getEventCallback(callback, context) {
  if (typeof callback === 'function') {
    return callback;
  } else {
    return context[callback];
  }
}

function bindModelEvents(model, events) {
  events.forEach(function(event) {
    //getEventCallback will resolve if it is a string or a method
    //and return a method
    model.on(event[0], getEventCallback(event[1], this), event[2] || this);
  }, this);
}

function unbindModelEvents(model, events) {
  events.forEach(function(event) {
    model.off(event[0], getEventCallback(event[1], this), event[2] || this);
  }, this);
}

Thorax.View.on({
  model: {
    error: function(model, errors){
      if (this._modelOptionsByCid[model.cid].errors) {
        this.trigger('error', errors, model);
      }
    },
    change: function(model) {
      this._onModelChange(model);
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

$.fn.model = function(view) {
  var $this = $(this),
      modelElement = $this.closest('[' + modelCidAttributeName + ']'),
      modelCid = modelElement && modelElement.attr(modelCidAttributeName);
  if (modelCid) {
    var view = view || $this.view();
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
