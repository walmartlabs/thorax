/*global getValue, inheritVars, walkInheritTree */
function dataObject(type, spec) {
  spec = inheritVars[type] = _.defaults({event: true}, spec);

  function getEventCallback(callback, context) {
    if (typeof callback === 'function') {
      return callback;
    } else {
      return context[callback];
    }
  }
  function bindEvents(target, source) {
    var context = this;
    walkInheritTree(source, spec.name, true, function(event) {
      // getEventCallback will resolve if it is a string or a method
      // and return a method
      target.on(event[0], getEventCallback(event[1], context), event[2] || context);
    });
  }

  function unbindEvents(target, source) {
    var context = this;
    walkInheritTree(source, spec.name, true, function(event) {
      target.off(event[0], getEventCallback(event[1], context), event[2] || context);
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

  function bindObject(dataObject, options) {
    // Collections do not have a cid attribute by default
    dataObject.cid = dataObject.cid || _.uniqueId(type);
    this[spec.array].push(dataObject);

    var options = this[spec.options](dataObject, options);

    bindEvents.call(this, dataObject, this.constructor);
    bindEvents.call(this, dataObject, this);

    if (Thorax.Util.shouldFetch(dataObject, options)) {
      loadObject(dataObject, options);
    } else {
      // want to trigger built in rendering without triggering event on model
      this[spec.change](dataObject, options);
    }
  }
  function unbindObject(dataObject) {
    this[spec.array] = _.without(this[spec.array], dataObject);
    dataObject.trigger('freeze');
    unbindEvents.call(this, dataObject, this.constructor);
    unbindEvents.call(this, dataObject, this);
    delete this[spec.hash][dataObject.cid];
  }

  function objectOptions(dataObject, options) {
    if (!this[spec.hash][dataObject.cid]) {
      this[spec.hash][dataObject.cid] = {
        render: true,
        fetch: true,
        success: false,
        errors: true
      };
    }
    _.extend(this[spec.hash][dataObject.cid], options || {});
    return this[spec.hash][dataObject.cid];
  }

  function setObject(dataObject, options) {
    var old = this[type];
    if (dataObject === old) {
      return this;
    }
    if (old) {
      this[spec.unbind](old);
    }

    if (dataObject) {
      this[type] = dataObject;

      if (spec.loading) {
        spec.loading.call(this);
      }

      this[spec.bind](dataObject, _.extend({}, this.options, options));
      this.$el.attr(spec.cidAttrName, dataObject.cid);
      dataObject.trigger('set', dataObject, old);
    } else {
      this[type] = false;
      if (spec.change) {
        this[spec.change](false);
      }
      this.$el.removeAttr(spec.cidAttrName);
    }
    return this;
  }

  var extend = {};
  extend[spec.bind] = bindObject;
  extend[spec.unbind] = unbindObject;
  extend[spec.set] = setObject;
  extend[spec.options] = objectOptions;

  _.extend(Thorax.View.prototype, extend);
}

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
