Thorax.ContextModel = Backbone.Model.extend({
  initialize: function() {
    var response = Backbone.Model.prototype.initialize.apply(this, arguments);
    return response;
  }
});

function generateContextModel() {
  var context = new Thorax.ContextModel();
  this.listenTo(context, 'change', function(model, options) {
    onContextChange.call(this, model, options);
    if (options.render) {
      this.render();
    }
  }, this);
  return context;
}

function onContextChange(context, options) {
  var detectedCids = [],
      detectedDataObjectsByCid = {},
      detectedDataObjectsKeysByCid = {};

  _.each(context.attributes, function(value, key) {
    if (value && value.cid) {
      detectedCids.push(value.cid);
      detectedDataObjectsByCid[value.cid] = value;
      detectedDataObjectsKeysByCid[value.cid] = key;
    }
  }, this);

  // Detect data objects that have been unset
  var unsetCids = [];
  // Need two loops as this unbindDataObject will mutate this._boundDataObjectsByCid
  _.each(this._boundDataObjectsByCid, function(object, cid) {
    if (detectedCids.indexOf(cid) === -1) {
      unsetCids.push(cid);
    }
  });
  _.each(unsetCids, function(cid) {
    var obj = detectedDataObjectsByCid[cid],
        key = detectedDataObjectsKeysByCid[cid],
        objOptions = this._objectOptionsByCid[cid];
    if (isView(obj)) {
      onRemoveView.call(this, key, obj);
    } else if (isModel(obj)) {
      onRemoveModel.call(this, key, obj, objOptions);
    } else if (isCollection(obj)) {
      onRemoveCollection.call(this, key, obj, objOptions);
    }
  }, this);

  // Detect data objects that have been set
  var setCids = unsetCids.length ? _.without.apply(_, _.clone(detectedCids).concat(unsetCids)) : detectedCids;
  _.each(setCids, function(cid) {
    var obj = detectedDataObjectsByCid[cid],
        key = detectedDataObjectsKeysByCid[cid];
    if (isView(obj)) {
      onAddView.call(this, key, obj);
    } else if (isModel(obj)) {
      onAddModel.call(this, key, obj, options);
    } else if (isCollection(obj)) {
      onAddCollection.call(this, key, obj, options);
    }
  }, this);
}

function onAddView(key, view) {
  this._addChild(view);
  if (Handlebars.helpers.view) {
    this.helpers[key] = function() {
      var args = _.toArray(arguments);
      args.unshift(view);
      return Handlebars.helpers.view.apply(this, args);
    }
  }
}

function onRemoveView(key, view) {
  this._removeChild(view);
  if (Handlebars.helpers.view) {
    delete this.helpers[key];
  }
}

function onAddCollection(key, collection, options) {
  if (key === 'collection') {
    this.setCollection(collection, options);
  } else {
    this.bindDataObject(collection, options);
  }
  if (Handlebars.helpers.collection) {
    this.helpers[key] = function() {
      var args = _.toArray(arguments);
      args.unshift(collection);
      return Handlebars.helpers.collection.apply(this, args);
    }
  }
}

function onRemoveCollection(key, collection, options) {
  if (key === 'collection') {
    this.setCollection(false);
  } else {
    this.unbindDataObject(collection);
  }
  if (Handlebars.helpers.collection) {
    delete this.helpers[key];
  }
}

function onAddModel(key, model, options) {
  if (!('merge' in options) && key === 'model') {
    options.merge = true;
  }
  if (key === 'model') {
    this.setModel(model, options);
  } else {
    this.bindDataObject(model, options);
  }
  if (options.merge) {
    this.context.set(model.attributes);
  } else {
    this.context.set(key, model.attributes);
  }
}

function onRemoveModel(key, model, options) {
  if (key === 'model') {
    this.setModel(false);
  } else {
    this.unbindDataObject(model, options);
  }
  if (options.merge) {
    _.each(model.attributes, function(value, key) {
      this.context.unset(key);
    }, this);
  }
}

// Duck duck duck duck...
function isView(view) {
  return view && view.$el && view.render;
}

// Forward method names
_.each(['get', 'set', 'has', 'unset', 'clear'], function(methodName) {
  Thorax.View.prototype[methodName] = function() {
    return this.context[methodName].apply(this.context, arguments);
  };
});