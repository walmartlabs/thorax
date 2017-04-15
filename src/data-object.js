/*global $serverSide, getValue, inheritVars, listenTo, walkInheritTree */

function dataObject(type, spec) {
  spec = inheritVars[type] = _.defaults({
    name: '_' + type + 'Events',
    event: true
  }, spec);

  spec.preConfig = function(view, options) {
    // If we were passed this data object in the options, then we want to
    // save it for later so we don't bind to it imediately (and consequently
    // be unable to bind to future set* calls)
    if (options && options[type]) {
      options['_' + type] = options[type];
      options[type] = null;
    }
  };

  // Add a callback in the view constructor
  spec.ctor = function(view) {
    var object = view['_' + type];
    if (object) {
      // Need to null this.model/collection so setModel/Collection will
      // not treat it as the old model/collection and immediately return
      delete view['_' + type];

      view[spec.set](object);
    }
  };

  function setObject(dataObject, options) {
    if (spec.cast) {
      dataObject = spec.cast(dataObject);
    }

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
        spec.loading(this);
      }

      this.bindDataObject(type, dataObject, _.extend({}, this.options, options));
      if ($el) {
        var attr = {};
        if ($serverSide && spec.idAttrName) {
          attr[spec.idAttrName] = dataObject.id;
        }
        attr[spec.cidAttrName] = dataObject.cid;
        $el.attr(attr);
      }
      dataObject.trigger('set', dataObject, old);
    } else {
      this[type] = false;
      if (spec.change) {
        spec.change(this, false);
      }
      $el && $el.removeAttr(spec.cidAttrName);
    }
    this.trigger('change:data-object', type, dataObject, old);
    return this;
  }

  Thorax.View.prototype[spec.set] = setObject;
}

_.extend(Thorax.View.prototype, {
  getObjectOptions: function(dataObject) {
    return dataObject && this._objectOptionsByCid[dataObject.cid];
  },

  bindDataObject: function(type, dataObject, options) {
    if (this._boundDataObjectsByCid[dataObject.cid]) {
      return;
    }
    this._boundDataObjectsByCid[dataObject.cid] = dataObject;

    var options = this._modifyDataObjectOptions(dataObject, _.extend({}, inheritVars[type].defaultOptions, options));
    this._objectOptionsByCid[dataObject.cid] = options;

    bindEvents(this, type, dataObject, this.constructor);
    bindEvents(this, type, dataObject, this);

    var spec = inheritVars[type];
    spec.bindCallback && spec.bindCallback(this, dataObject, options);

    if (dataObject.shouldFetch && dataObject.shouldFetch(options)) {
      loadObject(dataObject, options);
    } else if (inheritVars[type].change) {
      // want to trigger built in rendering without triggering event on model
      inheritVars[type].change(this, dataObject, options);
    }
  },

  unbindDataObject: function (dataObject) {
    this.stopListening(dataObject);
    delete this._boundDataObjectsByCid[dataObject.cid];
    delete this._objectOptionsByCid[dataObject.cid];
  },

  _modifyDataObjectOptions: function(dataObject, options) {
    return options;
  }
});

function bindEvents(context, type, target, source) {
  walkInheritTree(source, '_' + type + 'Events', true, function(event) {
    listenTo(context, target, event[0], event[1], event[2] || context);
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
  if (_.isFunction(callback)) {
    return callback;
  } else {
    return context[callback];
  }
}
