(function() {
  
  var root = this,
    Backbone = root.Backbone,
    Handlebars = root.Handlebars,
    Thorax = root.Thorax,
    _ = root._,
    $ = root.$,
    _configure = Thorax.View.prototype._configure,
    _render = Thorax.View.prototype.render,
    bindAttributeName = 'data-bind-method-name',
    bindIdAttributeName = 'data-bind-id',
    bindAttributeAttributeName = 'data-bind-attribute-id';

  if (Thorax.View.prototype.setModel) {
    var _setModel = Thorax.View.prototype.setModel;
    Thorax.View.prototype.setModel = function(model, options) {
      if (!model) {
        this._bindWatchedAttributes = {};
      }
      if (options && options.watch) {
        this.on(model, 'change', function() {
          updateBoundAttributes.call(this, model.attributes);
          options.watch.forEach(function(attr) {
            var value = model.get(attr);
            updateBoundElements.call(this, attr, value);
          }, this);
        }, this);
        options.watch.forEach(function(attr) {
          this._bindWatchedAttributes[attr] = true;
        }, this);
      }
      return _setModel.call(this, model, options);
    };
  }

  Thorax.View.prototype._configure = function(options) {
    this._cachedBoundMethods = {};
    this._cachedBoundOptions = {};
    this._bindWatchedAttributes = {};
    this._cachedBoundAttrOptions = {};
    this._cachedBoundAttributeMethods = {};
    return _configure.call(this, options);
  };

  Thorax.View.prototype.render = function() {
    this._cachedBoundOptions = {};
    this._cachedBoundAttrOptions = {};
    _render.apply(this, arguments);
  };

  function updateBoundElements(methodName, content) {
    this.$('[' + bindAttributeName + '="' + methodName + '"]').forEach(function(element) {
      var $el = $(element);
      $el.html(String(processBind.call(this, content, this._cachedBoundOptions[methodName][$el.attr(bindIdAttributeName)])));
    }, this);
  }

  function processBind(value, options) {
    if (typeof value !== 'undefined' && options.fn && options.fn !== Handlebars.VM.noop) {
      return options.fn(value);
    } else if (typeof value === 'undefined' && options.inverse && options.inverse !== Handlebars.VM.noop) {
      return options.inverse(value);
    } else {
      return typeof value === 'undefined' ? '' : value;
    }
  }

  Handlebars.registerHelper('bind', function(methodName, options) {
    var callback = false,
        id = _.uniqueId('bind-');
    if (this._view._bindWatchedAttributes[methodName]) {
      callback = (this._view.model && this._view.model.get(methodName)) || '';
    } else if (!this._view._bindWatchedAttributes[methodName] && !this._view._cachedBoundMethods[methodName] && this._view[methodName]) {
      this._view._cachedBoundMethods[methodName] = this._view[methodName];
      callback = this._view[methodName] = _.bind(function() {
        var response = this._cachedBoundMethods[methodName].apply(this, arguments);
        if (arguments.length > 0) {
          updateBoundElements.call(this, methodName, response);
        }
        return response;
      }, this._view);
    }
    if (!callback && this._view._cachedBoundMethods[methodName]) {
      callback = this._view._cachedBoundMethods[methodName];
    }
    if (callback === false) {
      return '';
    }
    if (!this._view._cachedBoundOptions[methodName]) {
      this._view._cachedBoundOptions[methodName] = {};
    }
    this._view._cachedBoundOptions[methodName][id] = options;
    var attrs = _.extend({}, options.hash);
    attrs[bindAttributeName] = methodName;
    attrs[bindIdAttributeName] = id;
    var content = typeof callback === 'function' ? callback.call(this._view) : callback;
    return new Handlebars.SafeString(Thorax.Util.tag.call(this, attrs, processBind.call(this._view, content, options)));
  });

  function updateBoundAttributes(attributes) {
    this.$('[' + bindAttributeAttributeName + ']').forEach(function(el) {
      var id = el.getAttribute(bindAttributeAttributeName),
          options = this._cachedBoundAttrOptions[id];
      _.each(options, function(methodName, attributeName) {
        var value = attributes[methodName];
        if (value === false) {
          el.removeAttribute(attributeName);
        } else {
          el.setAttribute(attributeName, String(value));
        }
      });
    }, this);
  }

  function updateBoundAttribute(id, attributeName, value) {
    var el = this.$('[' + bindAttributeAttributeName + '="' + id + '"]');
    if (value === false) {
      el.removeAttr(attributeName);
    } else {
      el.attr(attributeName, String(value));
    }
  }

  function processAttributeBind(id, methodName, attributeName) {
    var callback;
    if (this._bindWatchedAttributes[methodName]) {
      callback = (this.model && this.model.get(methodName));
    } else if (!this._bindWatchedAttributes[methodName] && !this._cachedBoundAttributeMethods[methodName] && this[methodName]) {
      this._cachedBoundAttributeMethods[methodName] = this[methodName];
      callback = this[methodName] = _.bind(function() {
        var response = this._cachedBoundAttributeMethods[methodName].apply(this, arguments);
        if (arguments.length > 0) {
          updateBoundAttribute.call(this, id, attributeName, response);
        }
        return response;
      }, this);
    }
    if (!callback && this._cachedBoundAttributeMethods[methodName]) {
      callback = this._cachedBoundAttributeMethods[methodName];
    }
    return typeof callback === 'function' ? callback.call(this) : callback;
  }

  Handlebars.registerHelper('bindAttr', function(options) {
    var attrs = {},
        id = _.uniqueId('bindAttr-');
    this._cachedBoundAttrOptions[id] = options.hash;
    attrs[bindAttributeAttributeName] = id;
    _.each(options.hash, function(methodName, attributeName) {
      var value = processAttributeBind.call(this._view, id, methodName, attributeName);
      if (value !== false) {
        attrs[attributeName] = value;
      }
    }, this);
    var attributesString = _.map(attrs, function(value, key) {
      return key + '="' + Handlebars.Utils.escapeExpression(value) + '"';
    }).join(' ');
    return new Handlebars.SafeString(' ' + attributesString + ' ');
  });
  
})();