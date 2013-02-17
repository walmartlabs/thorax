/*global inheritVars */

inheritVars.model.defaultOptions.populate = true;

var oldModelChange = inheritVars.model.change;
inheritVars.model.change = function() {
  oldModelChange.apply(this, arguments);
  // TODO : What can we do to remove this duplication?
  var modelOptions = this.model && this._objectOptionsByCid[this.model.cid];
  if (modelOptions && modelOptions.populate) {
    this.populate(this.model.attributes, modelOptions.populate === true ? {} : modelOptions.populate);
  }
};
inheritVars.model.defaultOptions.populate = true;

_.extend(Thorax.View.prototype, {
  //serializes a form present in the view, returning the serialized data
  //as an object
  //pass {set:false} to not update this.model if present
  //can pass options, callback or event in any order
  serialize: function() {
    var callback, options, event;
    //ignore undefined arguments in case event was null
    for (var i = 0; i < arguments.length; ++i) {
      if (_.isFunction(arguments[i])) {
        callback = arguments[i];
      } else if (_.isObject(arguments[i])) {
        if ('stopPropagation' in arguments[i] && 'preventDefault' in arguments[i]) {
          event = arguments[i];
        } else {
          options = arguments[i];
        }
      }
    }

    if (event && !this._preventDuplicateSubmission(event)) {
      return;
    }

    options = _.extend({
      set: true,
      validate: true,
      children: true,
      silent: true
    }, options || {});

    var attributes = options.attributes || {};

    //callback has context of element
    var view = this;
    var errors = [];
    eachNamedInput.call(this, options, function() {
      var value = view._getInputValue(this, options, errors);
      if (!_.isUndefined(value)) {
        objectAndKeyFromAttributesAndName.call(this, attributes, this.name, {mode: 'serialize'}, function(object, key) {
          if (!object[key]) {
            object[key] = value;
          } else if (_.isArray(object[key])) {
            object[key].push(value);
          } else {
            object[key] = [object[key], value];
          }
        });
      }
    });

    this.trigger('serialize', attributes, options);

    if (options.validate) {
      var validateInputErrors = this.validateInput(attributes);
      if (validateInputErrors && validateInputErrors.length) {
        errors = errors.concat(validateInputErrors);
      }
      this.trigger('validate', attributes, errors, options);
      if (errors.length) {
        this.trigger('error', errors);
        return;
      }
    }

    if (options.set && this.model) {
      if (!this.model.set(attributes, {silent: options.silent})) {
        return false;
      }
    }

    callback && callback.call(this, attributes, _.bind(resetSubmitState, this));
    return attributes;
  },

  _preventDuplicateSubmission: function(event, callback) {
    event.preventDefault();

    var form = $(event.target);
    if ((event.target.tagName || '').toLowerCase() !== 'form') {
      // Handle non-submit events by gating on the form
      form = $(event.target).closest('form');
    }

    if (!form.attr('data-submit-wait')) {
      form.attr('data-submit-wait', 'true');
      if (callback) {
        callback.call(this, event);
      }
      return true;
    } else {
      return false;
    }
  },

  //populate a form from the passed attributes or this.model if present
  populate: function(attributes, options) {
    options = _.extend({
      children: true
    }, options || {});

    var value,
        attributes = attributes || this._getContext();

    //callback has context of element
    eachNamedInput.call(this, options, function() {
      objectAndKeyFromAttributesAndName.call(this, attributes, this.name, {mode: 'populate'}, function(object, key) {
        value = object && object[key];

        if (!_.isUndefined(value)) {
          //will only execute if we have a name that matches the structure in attributes
          if (this.type === 'checkbox' && _.isBoolean(value)) {
            this.checked = value;
          } else if (this.type === 'checkbox' || this.type === 'radio') {
            this.checked = value == this.value;
          } else {
            this.value = value;
          }
        }
      });
    });

    this.trigger('populate', attributes);
  },

  //perform form validation, implemented by child class
  validateInput: function(/* attributes, options, errors */) {},

  _getInputValue: function(input /* , options, errors */) {
    if (input.type === 'checkbox' || input.type === 'radio') {
      if (input.checked) {
        return input.value;
      }
    } else if (input.multiple === true) {
      var values = [];
      $('option', input).each(function() {
        if (this.selected) {
          values.push(this.value);
        }
      });
      return values;
    } else {
      return input.value;
    }
  }
});

Thorax.View.on({
  error: function() {
    resetSubmitState.call(this);

    // If we errored with a model we want to reset the content but leave the UI
    // intact. If the user updates the data and serializes any overwritten data
    // will be restored.
    if (this.model && this.model.previousAttributes) {
      this.model.set(this.model.previousAttributes(), {
        silent: true
      });
    }
  },
  deactivated: function() {
    resetSubmitState.call(this);
  }
});

function eachNamedInput(options, iterator, context) {
  var i = 0,
      self = this;

  this.$('select,input,textarea', options.root || this.el).each(function() {
    if (!options.children) {
      if (self !== $(this).view({helper: false})) {
        return;
      }
    }
    if (this.type !== 'button' && this.type !== 'cancel' && this.type !== 'submit' && this.name && this.name !== '') {
      iterator.call(context || this, i, this);
      ++i;
    }
  });
}

//calls a callback with the correct object fragment and key from a compound name
function objectAndKeyFromAttributesAndName(attributes, name, options, callback) {
  var key,
      object = attributes,
      keys = name.split('['),
      mode = options.mode;

  for (var i = 0; i < keys.length - 1; ++i) {
    key = keys[i].replace(']', '');
    if (!object[key]) {
      if (mode === 'serialize') {
        object[key] = {};
      } else {
        return callback.call(this, false, key);
      }
    }
    object = object[key];
  }
  key = keys[keys.length - 1].replace(']', '');
  callback.call(this, object, key);
}

function resetSubmitState() {
  this.$('form').removeAttr('data-submit-wait');
}
