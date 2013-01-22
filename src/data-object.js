/*global getValue, inheritVars, walkInheritTree */

function dataObject(type, spec) {
  spec = inheritVars[type] = _.defaults({
    name: '_' + type + 'Events',
    event: true
  }, spec);

  // Add a callback in the view constructor
  spec.ctor = function() {
    if (this[type]) {
      // Need to null this.model/collection so setModel/Collection will
      // not treat it as the old model/collection and immediately return
      var object = this[type];
      this[type] = null;
      this[spec.set](object);
    }
  };

  function setObject(dataObject, options) {
    var old = this[type],
        $el = getValue(this, spec.$el);

    if (dataObject === old) {
      return this;
    }
    if (old) {
      this.unbindDataObject(old);
    }

    if (dataObject) {
      this[type] = dataObject;

      if (spec.loading) {
        spec.loading.call(this);
      }

      this.bindDataObject(type, dataObject, _.extend({}, this.options, options));
      $el.attr(spec.cidAttrName, dataObject.cid);
      dataObject.trigger('set', dataObject, old);
    } else {
      this[type] = false;
      if (spec.change) {
        spec.change.call(this, false);
      }
      $el.removeAttr(spec.cidAttrName);
    }
    this.trigger('change:data-object', type, dataObject, old);
    spec.setCallback && spec.setCallback.call(this, dataObject, options);
    return this;
  }

  Thorax.View.prototype[spec.set] = setObject;
}

_.extend(Thorax.View.prototype, {
  bindDataObject: function(type, dataObject, options) {
    if (this._boundDataObjectsByCid[dataObject.cid]) {
      return false;
    }
    // Collections do not have a cid attribute by default
    ensureDataObjectCid(type, dataObject);
    this._boundDataObjectsByCid[dataObject.cid] = dataObject;

    var options = this._modifyDataObjectOptions(dataObject, _.extend({}, inheritVars[type].defaultOptions, options));
    this._objectOptionsByCid[dataObject.cid] = options;

    bindEvents.call(this, type, dataObject, this.constructor);
    bindEvents.call(this, type, dataObject, this);

    if (dataObject.shouldFetch) {
      if (dataObject.shouldFetch(options)) {
        loadObject(dataObject, options);
      } else if (inheritVars[type].change) {
        // want to trigger built in rendering without triggering event on model
        inheritVars[type].change.call(this, dataObject, options);
      }
    }

    return true;
  },

  unbindDataObject: function (dataObject) {
    if (!this._boundDataObjectsByCid[dataObject.cid]) {
      return false;
    }
    delete this._boundDataObjectsByCid[dataObject.cid];
    dataObject.trigger('freeze');
    this.stopListening(dataObject);
    delete this._objectOptionsByCid[dataObject.cid];
    return true;
  },

  _modifyDataObjectOptions: function(dataObject, options) {
    return options;
  }
});

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
