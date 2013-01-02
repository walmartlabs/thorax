/*global inheritVars, walkInheritTree */

function dataObject(type, spec) {
  spec = inheritVars[type] = _.defaults({
    name: '_' + type + 'Events',
    event: true
  }, spec);
}

function bindDataObject(key, dataObject, options) {
  // Collections do not have a cid attribute by default
  ensureDataObjectCid(type, dataObject);

  // noop if the object is already bound
  // TODO: handle changing object from one key to another
  if (this._boundDataObjectsByCid[dataObject.cid]) {
    return false;
  }

  var type = getDataObjectType(dataObject),
      spec = inheritVars[type],
      isPrimary = type === key, // calling set('model', model) or set('collection', collection)
      $el = getValue(this, spec.$el);

  this._boundDataObjectCidsByKey[key] = dataObject.cid;
  this._boundDataObjectKeysByCid[dataObject.cid] = key;
  this._boundDataObjectsByCid[dataObject.cid] = dataObject;

  // Copy model / collection to this.model / this.collection
  if (isPrimary) {
    this[type] = dataObject;
    spec.loading && spec.loading.call(this);
    $el.attr(spec.cidAttrName, dataObject.cid);
  }

  options = _.extend({}, inheritVars[type].defaultOptions.call(this, key, dataObject), options);
  this._boundDataObjectOptionsByCid[dataObject.cid] = options;

  bindEvents.call(this, type, dataObject, this.constructor);
  bindEvents.call(this, type, dataObject, this);

  spec.bindCallback && spec.bindCallback.call(this, dataObject, options);

  if (Thorax.Util.shouldFetch(dataObject, options)) {
    loadObject(dataObject, options);
  } else if (inheritVars[type].change) {
    // Want to trigger built in rendering without triggering event on model / collection
    spec.change.call(this, dataObject, options);
  }
  return true;
}

function unbindDataObject(key, dataObject) {
  // noop if object is not bound
  if (!this._boundDataObjectsByCid[dataObject.cid]) {
    return false;
  }

  var type = getDataObjectType(dataObject),
      spec = inheritVars[type],
      isPrimary = type === key,
      $el = getValue(this, spec.$el);

  delete this._boundDataObjectCidsByKey[key];
  delete this._boundDataObjectKeysByCid[dataObject.cid];
  delete this._boundDataObjectsByCid[dataObject.cid];
  this.stopListening(dataObject);
  delete this._boundDataObjectOptionsByCid[dataObject.cid];

  if (isPrimary) {
    this[type] = false;
    spec.change && spec.change.call(this, false);
    $el.removeAttr(spec.cidAttrName);
  }

  return true;
}

function getDataObjectOptions(dataObject) {
  return dataObject && this._boundDataObjectOptionsByCid[dataObject.cid];
}

function getDataObjectType(dataObject) {
  if (isModel(dataObject)) {
    return 'model';
  } else if (isCollection(dataObject)) {
    return 'collection';
  } else {
    throw new Error('Unknown data object bound: ' + (typeof dataObject));
  }
}

function isModel(model) {
  return model && model.attributes && model.set;
}

function isCollection(collection) {
  return collection && collection.indexOf && collection.models;
}

function bindEvents(type, target, source) {
  var context = this;
  walkInheritTree(source, '_' + type + 'Events', true, function(event) {
    // getEventCallback will resolve if it is a string or a method
    // and return a method
    context.listenTo(target, event[0], _.bind(getEventCallback(event[1], context), event[2] || context));
  });
}

function loadObject(dataObject, options) {
  if (dataObject.load) {
    dataObject.load(function() {
      options && options.success && options.success(dataObject);
    }, options);
  } else {
    dataObject.fetch(options);
  }
}

function getEventCallback(callback, context) {
  if (typeof callback === 'function') {
    return callback;
  } else {
    return context[callback];
  }
}

function ensureDataObjectCid(type, obj) {
  obj.cid = obj.cid || _.uniqueId(type);
}

Thorax.Util.shouldFetch = function(modelOrCollection, options) {
  if (!options.fetch) {
    return;
  }

  var isCollection = !modelOrCollection.collection && modelOrCollection._byCid && modelOrCollection._byId,
      url = (
        (!modelOrCollection.collection && _.result(modelOrCollection, 'urlRoot')) ||
        (modelOrCollection.collection && _.result(modelOrCollection.collection, 'url')) ||
        (isCollection && _.result(modelOrCollection, 'url'))
      );

  return url && !(
    (modelOrCollection.isPopulated && modelOrCollection.isPopulated()) ||
    (isCollection
      ? Thorax.Collection && Thorax.Collection.prototype.isPopulated.call(modelOrCollection)
      : Thorax.Model.prototype.isPopulated.call(modelOrCollection)
    )
  );
};
