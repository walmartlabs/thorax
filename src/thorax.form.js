(function(){
  var root = this,
      Backbone = root.Backbone,
      Thorax = root.Thorax,
      _ = root._,
      $ = root.$;

  if (Thorax.View.prototype._setModelOptions) {
    var _onModelChange = Thorax.View.prototype._onModelChange,
        _setModelOptions = Thorax.View.prototype._setModelOptions;
    _.extend(Thorax.View.prototype, {
      _onModelChange: function() {
        var response = _onModelChange.call(this);
        if (this._modelOptions.populate) {
          this.populate(this.model.attributes);
        }
        return response;
      },
      _setModelOptions: function(options) {
        if (!options) {
          options = {};
        }
        if (!('populate' in options)) {
          options.populate = true;
        }
        return _setModelOptions.call(this, options);
      }
    });
  }

  _.extend(Thorax.View.prototype, {
    //serializes a form present in the view, returning the serialized data
    //as an object
    //pass {set:false} to not update this.model if present
    //can pass options, callback or event in any order
    serialize: function() {
      var callback, options, event;
      //ignore undefined arguments in case event was null
      for (var i = 0; i < arguments.length; ++i) {
        if (typeof arguments[i] === 'function') {
          callback = arguments[i];
        } else if (typeof arguments[i] === 'object') {
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
        validate: true
      },options || {});
  
      var attributes = options.attributes || {};
      
      //callback has context of element
      var view = this;
      var errors = [];
      eachNamedInput.call(this, options, function() {
        var value = view._getInputValue(this, options, errors);
        if (typeof value !== 'undefined') {
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
        if (!this.model.set(attributes, {silent: true})) {
          return false;
        };
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
    populate: function(attributes) {
      var value, attributes = attributes || this._getContext(this.model);
      //callback has context of element
      eachNamedInput.call(this, {}, function() {
        objectAndKeyFromAttributesAndName.call(this, attributes, this.name, {mode: 'populate'}, function(object, key) {
          if (object && typeof (value = object[key]) !== 'undefined') {
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
    validateInput: function(attributes, options, errors) {},

    _getInputValue: function(input, options, errors) {
      if (input.type === 'checkbox' || input.type === 'radio') {
        if (input.checked) {
          return input.value;
        }
      } else if (input.multiple === true) {
        var values = [];
        $('option',input).each(function(){
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
  })

  function eachNamedInput(options, iterator, context) {
    var i = 0;
    this.$('select,input,textarea', options.root || this.el).each(function() {
      if (this.type !== 'button' && this.type !== 'cancel' && this.type !== 'submit' && this.name && this.name !== '') {
        iterator.call(context || this, i, this);
        ++i;
      }
    });
  }

  //calls a callback with the correct object fragment and key from a compound name
  function objectAndKeyFromAttributesAndName(attributes, name, options, callback) {
    var key, i, object = attributes, keys = name.split('['), mode = options.mode;
    for(i = 0; i < keys.length - 1; ++i) {
      key = keys[i].replace(']','');
      if (!object[key]) {
        if (mode == 'serialize') {
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

})();
