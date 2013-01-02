/*global createRegistryWrapper, dataObject */
var modelCidAttributeName = 'data-model-cid';

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
    return keys.length > 1 || (keys.length === 1 && keys[0] !== this.idAttribute);
  }
});

Thorax.Models = {};
createRegistryWrapper(Thorax.Model, Thorax.Models);

dataObject('model', {
  change: setModelAttributesOnContext, // Defined in src/context
  defaultOptions: function(key, model) {
    return {
      fetch: true,
      success: false,
      errors: true,
      render: true,
      merge: key === 'model'
    };
  },
  $el: '$el',
  cidAttrName: modelCidAttributeName
});

Thorax.View.on({
  model: {
    error: function(model, errors) {
      if (getDataObjectOptions.call(this, model).errors) {
        this.trigger('error', errors, model);
      }
    },
    change: function(model) {
      setModelAttributesOnContext.call(this, model);
      this._context.trigger('change', model, getDataObjectOptions.call(this, model));
    }
  }
});

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
