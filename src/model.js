/*global createRegistryWrapper, dataObject, getValue, inheritVars */
var modelCidAttributeName = 'data-model-cid',
    modelIdAttributeName = 'data-model-id';

Thorax.Model = Backbone.Model.extend({
  isEmpty: function() {
    return !this.isPopulated();
  },
  isPopulated: function() {
    /*jshint -W089 */

    // We are populated if we have attributes set
    var attributes = _.clone(this.attributes),
        defaults = getValue(this, 'defaults') || {};
    for (var default_key in defaults) {
      if (attributes[default_key] != defaults[default_key]) {
        return true;
      }
      delete attributes[default_key];
    }
    var keys = _.keys(attributes);
    return keys.length > 1 || (keys.length === 1 && keys[0] !== this.idAttribute);
  },
  shouldFetch: function(options) {
    // url() will throw if model has no `urlRoot` and no `collection`
    // or has `collection` and `collection` has no `url`
    var url;
    try {
      url = getValue(this, 'url');
    } catch(e) {
      url = false;
    }
    return options.fetch && !!url && !this.isPopulated();
  }
});

Thorax.Models = {};
createRegistryWrapper(Thorax.Model, Thorax.Models);

dataObject('model', {
  set: 'setModel',
  defaultOptions: {
    render: undefined,    // Default to deferred rendering
    fetch: true,
    success: false,
    invalid: true
  },
  change: onModelChange,
  $el: '$el',
  idAttrName: modelIdAttributeName,
  cidAttrName: modelCidAttributeName
});

function onModelChange(view, model, options) {
  if (options && options.serializing) {
    return;
  }

  var modelOptions = view.getObjectOptions(model) || {};
  // !modelOptions will be true when setModel(false) is called
  view.conditionalRender(modelOptions.render);
}

Thorax.View.on({
  model: {
    invalid: function(model, errors) {
      if (this.getObjectOptions(model).invalid) {
        this.trigger('invalid', errors, model);
      }
    },
    error: function(model, resp /*, options */) {
      this.trigger('error', resp, model);
    },
    change: function(model, options) {
      // Indirect refernece to allow for overrides
      inheritVars.model.change(this, model, options);
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
      return collection.get(modelCid);
    }
  }
  return false;
};
