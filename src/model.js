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
createRegistryWrapper(Thorax.Model, Thorax.Models);

{{#inject "constructor"}}
  if (this.model) {
    //need to null this.model so setModel will not treat
    //it as the old model and immediately return
    var model = this.model;
    this.model = null;
    this.setModel(model);
  }
{{/inject}}

inheritVars.model = {
  event: true,
  name: '_modelEvents',
  array: '_models',
  hash: '_modelOptionsByCid',

  unbind: 'unbindModel'
};


_.extend(Thorax.View.prototype, {
  bindModel: function(model, options) {
    this._models.push(model);
    var modelOptions = this._setModelOptions(model, options);
    bindEvents.call(this, model, this.constructor._modelEvents);
    bindEvents.call(this, model, this._modelEvents);
    if (Thorax.Util.shouldFetch(this.model, modelOptions)) {
      this._loadModel(this.model, modelOptions);
    } else {
      //want to trigger built in event handler (render() + populate())
      //without triggering event on model
      this._onModelChange(model);
    }
  },
  unbindModel: function(model) {
    this._models = _.without(this._models, model);
    model.trigger('freeze');
    unbindEvents.call(this, model, this.constructor._modelEvents);
    unbindEvents.call(this, model, this._modelEvents);
    delete this._modelOptionsByCid[model.cid];
  },
  setModel: function(model, options) {
    var oldModel = this.model;
    if (model === oldModel) {
      return this;
    }
    if (oldModel) {
      this.unbindModel(oldModel);
    }
    if (model) {
      this.$el.attr(modelCidAttributeName, model.cid);
      model.name && this.$el.attr(modelNameAttributeName, model.name);
      this.model = model;
      this.bindModel(model, options);
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
    // !modelOptions will be true when setModel(false) is called
    if (!modelOptions || (modelOptions && modelOptions.render)) {
      this.render();
    }
    {{{override "model-change" indent=4}}}
  },
  _loadModel: function(model, options) {
    {{#has-plugin "loading"}}
      if (model.load) {
        model.load(function() {
          options && options.success && options.success(model);
        }, options);
      } else {
        model.fetch(options);
      }
    {{else}}
      model.fetch(options);
    {{/has-plugin}}
  },
  _setModelOptions: function(model, options) {
    if (!this._modelOptionsByCid[model.cid]) {
      this._modelOptionsByCid[model.cid] = {
        fetch: true,
        success: false,
        render: true,
        errors: true
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

function bindEvents(target, events) {
  _.each(events, function(event) {
    // getEventCallback will resolve if it is a string or a method
    // and return a method
    target.on(event[0], getEventCallback(event[1], this), event[2] || this);
  }, this);
}

function unbindEvents(target, events) {
  _.each(events, function(event) {
    target.off(event[0], getEventCallback(event[1], this), event[2] || this);
  }, this);
}

Thorax.View.on({
  model: {
    error: function(model, errors) {
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
  if (!options.fetch) {
    return;
  }

  var isCollection = !modelOrCollection.collection && modelOrCollection._byCid && modelOrCollection._byId,
      url = (
        (!modelOrCollection.collection && getValue(modelOrCollection, 'urlRoot')) ||
        (modelOrCollection.collection && getValue(modelOrCollection.collection, 'url')) ||
        (isCollection && getValue(modelOrCollection, 'url'))
      );

  return url && !(
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
