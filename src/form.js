/*global inheritVars */

inheritVars.model.defaultOptions.populate = true;

var oldModelChange = inheritVars.model.change;
inheritVars.model.change = function() {
  this._isChanging = true;
  oldModelChange.apply(this, arguments);
  this._isChanging = false;

  var populate = populateOptions(this);
  if (this._renderCount && populate) {
    this.populate(!populate.context && this.model.attributes, populate);
  }
};

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
    eachNamedInput(this, options, function(element) {
      var value = view._getInputValue(element, options, errors);
      if (!_.isUndefined(value)) {
        objectAndKeyFromAttributesAndName(attributes, element.name, {mode: 'serialize'}, function(object, key) {
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

    if (!options._silent) {
      this.trigger('serialize', attributes, options);
    }

    if (options.validate) {
      var validateInputErrors = this.validateInput(attributes);
      if (validateInputErrors && validateInputErrors.length) {
        errors = errors.concat(validateInputErrors);
      }
      this.trigger('validate', attributes, errors, options);
      if (errors.length) {
        this.trigger('invalid', errors);
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
    eachNamedInput(this, options, function(element) {
      objectAndKeyFromAttributesAndName(attributes, element.name, {mode: 'populate'}, function(object, key) {
        value = object && object[key];

        if (!_.isUndefined(value)) {
          //will only execute if we have a name that matches the structure in attributes
          if (element.type === 'checkbox' && _.isBoolean(value)) {
            element.checked = value;
          } else if (element.type === 'checkbox' || element.type === 'radio') {
            element.checked = value == element.value;
          } else {
            element.value = value;
          }
        }
      });
    });

    ++this._populateCount;
    if (!options._silent) {
      this.trigger('populate', attributes);
    }
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
  },

  _populateCount: 0
});

// Keeping state in the views
Thorax.View.on({
  'before:rendered': function() {
    if (!this._renderCount) { return; }

    var modelOptions = this.getObjectOptions(this.model);
    // When we have previously populated and rendered the view, reuse the user data
    this.previousFormData = filterObject(
      this.serialize(_.extend({ set: false, validate: false, _silent: true }, modelOptions)),
      function(value) { return value !== '' && value != null; }
    );
  },
  rendered: function() {
    var populate = populateOptions(this);

    if (populate && !this._isChanging && !this._populateCount) {
      this.populate(!populate.context && this.model.attributes, populate);
    }
    if (this.previousFormData) {
      this.populate(this.previousFormData, _.extend({_silent: true}, populate));
    }

    this.previousFormData = null;
  }
});

function filterObject(object, callback) {
  _.each(object, function (value, key) {
    if (_.isObject(value)) {
      return filterObject(value, callback);
    }
    if (callback(value, key, object) === false) {
      delete object[key];
    }
  });
  return object;
}

Thorax.View.on({
  invalid: onErrorOrInvalidData,
  error: onErrorOrInvalidData,
  deactivated: function() {
    if (this.$el) {
      resetSubmitState.call(this);
    }
  }
});

function onErrorOrInvalidData () {
  resetSubmitState.call(this);

  // If we errored with a model we want to reset the content but leave the UI
  // intact. If the user updates the data and serializes any overwritten data
  // will be restored.
  if (this.model && this.model.previousAttributes) {
    this.model.set(this.model.previousAttributes(), {
      silent: true
    });
  }
}

function eachNamedInput(view, options, iterator) {
  var i = 0;

  view.$('select,input,textarea', options.root || view.el).each(function() {
    if (!options.children) {
      if (view !== $(this).view({helper: false})) {
        return;
      }
    }
    if (this.type !== 'button' && this.type !== 'cancel' && this.type !== 'submit' && this.name) {
      iterator(this, i);
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
        return callback(undefined, key);
      }
    }
    object = object[key];
  }
  key = keys[keys.length - 1].replace(']', '');
  callback(object, key);
}

function resetSubmitState() {
  this.$('form').removeAttr('data-submit-wait');
}

function populateOptions(view) {
  var modelOptions = view.getObjectOptions(view.model) || {};
  return modelOptions.populate === true ? {} : modelOptions.populate;
}
