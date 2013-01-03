Thorax.ContextModel = Backbone.Model.extend({
  initialize: function() {
    var response = Backbone.Model.prototype.initialize.apply(this, arguments);
    return response;
  }
});

function generateContextModel() {
  var context = new Thorax.ContextModel();
  // Forward change and change:* events to view
  this.listenTo(context, 'all', function() {
    this.trigger.apply(this, arguments);
  });

  this.listenTo(context, 'change', function(model, options) {
    options = options || {};
    if (options.render) {
      this.render();
    }
  }, this);
  return context;
}

_.extend(Thorax.View.prototype, {
  set: function(key, val, options) {
    var attrs;
    if (key == null) {
      return this;
    }
    if (_.isObject(key)) {
      attrs = key;
      options = val;
    } else {
      (attrs = {})[key] = val;
    }

    var attrsForContext = {},
        shouldRender = !!options && options.render;

    // Loop over attrs to unset first so case of
    // bound data object from one key to another
    // is properly handled
    _.each(attrs, function(value, key) {
      if (!value) {
        var cid = this._boundDataObjectCidsByKey[key];
        if (cid) {
          unsetDataObject.call(this, key, this._boundObjectsByCid[cid]);
        } else {
          attrsForContext[key] = getModifiedValue.call(this, key, value);;
        }
      }
    }, this);

    _.each(attrs, function(value, key) {
      if (value) {
        if (value.cid) {
          setDataObject.call(this, key, value, options);
          if (getDataObjectOptions.call(this, value).render) {
            shouldRender = true;
          }
        } else {
          attrsForContext[key] = getModifiedValue.call(this, key, value);
        }
      }
    }, this);

    // loud set, will fire 'change' event
    this._context.set(attrsForContext, {render: shouldRender});

    return this;
  },
  unset: function(key, options) {
    var cid = this._boundDataObjectCidsByKey[key];
    if (cid) {
      unsetDataObject.call(this, key, this._boundDataObjectsByCid[cid]);
    }
    this._context.unset(key, options);
    return this;
  },
  clear: function(options) {
    _.each(this._boundDataObjectsByCid, function(obj) {
      unsetDataObject.call(this, this._boundObjectKeysByCid[obj.cid], obj);
    }, this);
    this._context.clear(options);
  }
});

// Forward method names
_.each(['get', 'has'], function(methodName) {
  Thorax.View.prototype[methodName] = function() {
    return this._context[methodName].apply(this._context, arguments);
  };
});

function setDataObject(key, obj, options) {
  if (isView(obj)) {
    onAddView.call(this, key, obj);
  } else if (isModel(obj)) {
    onAddModel.call(this, key, obj, options);
  } else if (isCollection(obj)) {
    onAddCollection.call(this, key, obj, options);
  }
}

function unsetDataObject(key, obj) {
  var options = getDataObjectOptions.call(this, obj);
  if (isView(obj)) {
    onRemoveView.call(this, key, obj);
  } else if (isModel(obj)) {
    onRemoveModel.call(this, key, obj, options);
  } else if (isCollection(obj)) {
    onRemoveCollection.call(this, key, obj, options);
  }
}

function onAddView(key, view) {
  this._context.set(key, view, {silent: true});
  this._addChild(view);
  // Models and collections will do this inside of unbindDataObject
  this._boundDataObjectCidsByKey[key] = view.cid;
  this._boundDataObjectKeysByCid[view.cid] = key;
  if (Handlebars.helpers.view) {
    this.helpers[key] = function() {
      var args = _.toArray(arguments);
      args.unshift(view);
      return Handlebars.helpers.view.apply(this, args);
    }
  }
}

function onRemoveView(key, view) {
  this._context.unset(key, {silent: true});
  this._removeChild(view);
  // Models and collections will do this inside of unbindDataObject
  delete this._boundDataObjectCidsByKey[key];
  delete this._boundDataObjectKeysByCid[view.cid];
  if (Handlebars.helpers.view) {
    delete this.helpers[key];
  }
}

function onAddCollection(key, collection, options) {
  this._context.set(key, collection, {silent: true});
  bindDataObject.call(this, key, collection, options);
  if (Handlebars.helpers.collection) {
    this.helpers[key] = function() {
      var args = _.toArray(arguments);
      args.unshift(collection);
      return Handlebars.helpers.collection.apply(this, args);
    }
  }
}

function onRemoveCollection(key, collection, options) {
  this._context.unset(key, {silent: true});
  unbindDataObject.call(this, key, collection, options);
  if (Handlebars.helpers.collection) {
    delete this.helpers[key];
  }
}

// setting / unsetting of keys on context is handled
// by setModelAttributesOnContext which is bound
// as a callback via dataObject() in model.js
function onAddModel(key, model, options) {
  bindDataObject.call(this, key, model, options);
}

function onRemoveModel(key, model, options) {
  unbindDataObject.call(this, key, model, options);
}

function setModelAttributesOnContext(model) {
  var key = this._boundDataObjectKeysByCid[model.cid],
      options = getDataObjectOptions.call(this, model),
      attrs = getModifiedValue.call(this, key, model, true);
  if (options.merge) {
    if (model) {
      this._context.set(attrs, {silent: true});
    } else {
      _.each(attrs, function(value, key) {
        this._context.unset(key, {silent: true});
      }, this);
    }
  } else {
    if (model) {
      this._context.set(key, attrs, {silent: true});
    } else {
      this._context.unset(key, {silent: true});
    }
  }
}

function getModifiedValue(key, value, isModel) {
  if (!this.modifyContext || !this.modifyContext[key]) {
    return isModel ? value.attributes : value;
  } else {
    return this.modifyContext[key].call(this, value);
  }
}

// Duck duck duck duck...
function isView(view) {
  return view && view.$el && view.render;
}
