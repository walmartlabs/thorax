(function() {

  var root = this,
      Backbone = root.Backbone,
      Handlebars = root.Handlebars,
      _ = root._,
      $ = root.$,
      Thorax;

  //support zepto.forEach on jQuery
  if (!$.fn.forEach) {
    $.fn.forEach = function(iterator, context) {
      $.fn.each.call(this, function(index) {
        iterator.call(context || this, this, index);
      });
    }
  }

  if (typeof exports !== 'undefined') {
    Thorax = exports;
  } else {
    Thorax = root.Thorax = {};
  }

  Thorax.VERSION = '2.0.0b1';

  var handlebarsExtension = 'handlebars',
      handlebarsExtensionRegExp = new RegExp('\\.' + handlebarsExtension + '$'),
      viewNameAttributeName = 'data-view-name',
      viewCidAttributeName = 'data-view-cid',
      viewPlaceholderAttributeName = 'data-view-tmp',
      viewHelperAttributeName = 'data-view-helper',
      elementPlaceholderAttributeName = 'data-element-tmp';

  //registry
  function registryGet(object, type, name, ignoreErrors) {
    if (!object[type][name] && !ignoreErrors) {
      throw new Error(type + ': ' + name + ' does not exist.');
    } else {
      return object[type][name];
    }
  }

  _.extend(Thorax, {
    templatePathPrefix: '',
    //view instances
    _viewsIndexedByCid: {},
    _templates: {},
    template: function(name, value, ignoreErrors) {
      var pathPrefix = Thorax.templatePathPrefix;
      //append templatePathPrefix if getting
      if (!value) {
        name = pathPrefix + name;
      }
      //always remove handlebars extension wether setting or getting
      name = name.replace(handlebarsExtensionRegExp, '');
      //append the template path prefix if it is missing
      if (pathPrefix && pathPrefix.length && name && name.substr(0, pathPrefix.length) !== pathPrefix) {
        name = pathPrefix + name;
      }
      if (!value) {
        return registryGet(this, '_templates', name, ignoreErrors);
      } else {
        return Thorax._templates[name] = typeof value === 'string' ? Handlebars.compile(value) : value;
      }
    }
  });

  Thorax.Util = {
    getViewInstance: function(name, attributes) {
      if (typeof name === 'string') {
        var klass = Thorax.view(name);
        return klass.cid ? _.extend(klass, attributes || {}) : new klass(attributes);
      } else if (typeof name === 'function') {
        return new name(attributes);
      } else {
        return name;
      }
    },
    getValue: function (object, prop) {
      if (!(object && object[prop])) {
        return null;
      }
      return _.isFunction(object[prop])
        ? object[prop].apply(object, Array.prototype.slice.call(arguments, 2))
        : object[prop];
    },
    extendConstructor: function(obj, key, callback) {
      var oldConstructor = obj[key];
      var newConstructor = function() {
        callback.apply(this, [oldConstructor].concat(Array.prototype.slice.apply(arguments)));
      };
      _.extend(newConstructor, oldConstructor);
      newConstructor.prototype = oldConstructor.prototype;
      newConstructor.prototype.constructor = newConstructor;
      return obj[key] = newConstructor;
    },
    //'selector' is not present in $('<p></p>')
    //TODO: investigage a better detection method
    is$: function(obj) {
      return typeof obj === 'object' && ('length' in obj);
    },
    expandToken: function(input, scope) {
      if (input && input.indexOf && input.indexOf('{{') >= 0) {
        var re = /(?:\{?[^{]+)|(?:\{\{([^}]+)\}\})/g,
            match,
            ret = [];
        function deref(token, scope) {
          var segments = token.split('.'),
              len = segments.length;
          for (var i = 0; scope && i < len; i++) {
            if (segments[i] !== 'this') {
              scope = scope[segments[i]];
            }
          }
          return scope;
        }
        while (match = re.exec(input)) {
          if (match[1]) {
            var params = match[1].split(/\s+/);
            if (params.length > 1) {
              var helper = params.shift();
              params = params.map(function(param) { return deref(param, scope); });
              if (Handlebars.helpers[helper]) {
                ret.push(Handlebars.helpers[helper].apply(scope, params));
              } else {
                // If the helper is not defined do nothing
                ret.push(match[0]);
              }
            } else {
              ret.push(deref(params[0], scope));
            }
          } else {
            ret.push(match[0]);
          }
        }
        input = ret.join('');
      }
      return input;
    },
    tag: function(attributes, content, scope) {
      var htmlAttributes = _.clone(attributes),
          tag = htmlAttributes.tag || htmlAttributes.tagName || 'div';
      if (htmlAttributes.tag) {
        delete htmlAttributes.tag;
      }
      if (htmlAttributes.tagName) {
        delete htmlAttributes.tagName;
      }
      return '<' + tag + ' ' + _.map(htmlAttributes, function(value, key) {
        if (typeof value === 'undefined') {
          return '';
        }
        var formattedValue = value;
        if (scope) {
          formattedValue = Thorax.Util.expandToken(value, scope);
        }
        return key + '="' + Handlebars.Utils.escapeExpression(formattedValue) + '"';
      }).join(' ') + '>' + (typeof content === 'undefined' ? '' : content) + '</' + tag + '>';
    },
    htmlAttributesFromOptions: function(options) {
      var htmlAttributes = {};
      if (options.tag) {
        htmlAttributes.tag = options.tag;
      }
      if (options.tagName) {
        htmlAttributes.tagName = options.tagName;
      }
      if (options['class']) {
        htmlAttributes['class'] = options['class'];
      }
      if (options.id) {
        htmlAttributes.id = options.id;
      }
      return htmlAttributes;
    },
    createRegistry: function(object, cacheName, methodName, klassName) {
      object[cacheName] = {};
      object[methodName] = function(name, value, ignoreErrors) {
        if (!value) {
          return registryGet(object, cacheName, name, ignoreErrors);
        } else {
          if (value.cid && !value.name) {
            value.name = name;
            return object[cacheName][name] = value;
          } else {
            if (!value.prototype) {
              value = object[klassName].extend(value);
            }
            value.name = name;
            value.prototype.name = name;
            return object[cacheName][name] = value;
          }
        }
      }
    }
  };

  Thorax.View = Backbone.View.extend({
    _configure: function(options) {
      Thorax._viewsIndexedByCid[this.cid] = this;
      this.children = {};
      this._renderCount = 0;

      //this.options is removed in Thorax.View, we merge passed
      //properties directly with the view and template context
      _.extend(this, options || {});
  
      //compile a string if it is set as this.template
      if (typeof this.template === 'string') {
        this.template = Handlebars.compile(this.template);
      } else if (this.name && !this.template) {
        //fetch the template 
        this.template = Thorax.template(this.name, null, true);
      }
    },
  
    _ensureElement : function() {
      Backbone.View.prototype._ensureElement.call(this);
      if (this.name) {
        this.$el.attr(viewNameAttributeName, this.name);
      }
      this.$el.attr(viewCidAttributeName, this.cid);      
    },

    _addChild: function(view) {
      this.children[view.cid] = view;
      if (!view.parent) {
        view.parent = this;
      }
      return view;
    },

    destroy: function(options) {
      options = _.defaults(options || {}, {
        children: true
      });
      this.trigger('destroyed');
      delete Thorax._viewsIndexedByCid[this.cid];
      _.each(this.children, function(child) {
        if (options.children) {
          child.parent = null;
          child.destroy();
        }
      });
      if (options.children) {
        this.children = {};
      }
    },

    render: function(output) {
      if (typeof output === 'undefined' || (!_.isElement(output) && !Thorax.Util.is$(output) && !(output && output.el) && typeof output !== 'string' && typeof output !== 'function')) {
        if (!this.template) {
          //if the name was set after the view was created try one more time to fetch a template
          if (this.name) {
            this.template = Thorax.template(this.name, null, true);
          }
          if (!this.template) {
            throw new Error('View ' + (this.name || this.cid) + '.render() was called with no content and no template set on the view.');
          }
        }
        output = this.renderTemplate(this.template);
      } else if (typeof output === 'function') {
        output = this.renderTemplate(output);
      }
      //accept a view, string, Handlebars.SafeString or DOM element
      this.html((output && output.el) || (output && output.string) || output);
      ++this._renderCount;
      this.trigger('rendered');
      return output;
    },
  
    context: function() {
      return this;
    },
  
    _getContext: function(attributes) {
      return _.extend({}, Thorax.Util.getValue(this, 'context'), attributes || {}, {
        cid: _.uniqueId('t'),
        _view: this
      });
    },
  
    renderTemplate: function(file, data, ignoreErrors) {
      var template;
      data = this._getContext(data);
      if (typeof file === 'function') {
        template = file;
      } else {
        template = this._loadTemplate(file);
      }
      if (!template) {
        if (ignoreErrors) {
          return ''
        } else {
          throw new Error('Unable to find template ' + file);
        }
      } else {
        return template(data);
      }
    },
    
    _loadTemplate: function(file, ignoreErrors) {
      return Thorax.template(file, null, ignoreErrors);
    },

    ensureRendered: function() {
      !this._renderCount && this.render();
    },
    
    html: function(html) {
      if (typeof html === 'undefined') {
        return this.el.innerHTML;
      } else {
        var element = this.$el.html(html);
        this._appendViews();
        this._appendElements();
        return element;
      }
    }
  });

  Thorax.Util.createRegistry(Thorax, '_views', 'view', 'View');

  //helpers
  Handlebars.registerHelper('super', function() {
    var parent = this._view.constructor && this._view.constructor.__super__;
    if (parent) {
      var template = parent.template;
      if (!template) { 
        if (!parent.name) {
          throw new Error('Cannot use super helper when parent has no name or template.');
        }
        template = Thorax.template(parent.name);
      }
      if (typeof template === 'string') {
        template = Handlebars.compile(template);
      }
      return new Handlebars.SafeString(template(this));
    } else {
      return '';
    }
  });
  
  Handlebars.registerHelper('template', function(name, options) {
    var context = _.extend({}, this, options ? options.hash : {});
    var output = Thorax.View.prototype.renderTemplate.call(this._view, name, context);
    return new Handlebars.SafeString(output);
  });

  //view helper
  var viewTemplateOverrides = {};
  Handlebars.registerHelper('view', function(view, options) {
    if (!view) {
      return '';
    }
    var instance = Thorax.Util.getViewInstance(view, options ? options.hash : {}),
        placeholder_id = instance.cid + '-' + _.uniqueId('placeholder');
    this._view._addChild(instance);
    this._view.trigger('child', instance);
    if (options.fn) {
      viewTemplateOverrides[placeholder_id] = options.fn;
    }
    var htmlAttributes = Thorax.Util.htmlAttributesFromOptions(options.hash);
    htmlAttributes[viewPlaceholderAttributeName] = placeholder_id;
    return new Handlebars.SafeString(Thorax.Util.tag.call(this, htmlAttributes));
  });

  Thorax.HelperView = Thorax.View.extend({
    _ensureElement: function() {
      Thorax.View.prototype._ensureElement.apply(this, arguments);
      this.$el.attr(viewHelperAttributeName, this._helperName);
    },
    context: function() {
      return this.parent.context.apply(this.parent, arguments);
    }
  });

  //ensure nested inline helpers will always have this.parent
  //set to the view containing the template
  function getParent(parent) {
    while (parent._helperName) {
      parent = parent.parent;
    }
    return parent;
  }

  Handlebars.registerViewHelper = function(name, viewClass, callback) {
    if (arguments.length === 2) {
      options = {};
      callback = arguments[1];
      viewClass = Thorax.HelperView;
    }
    Handlebars.registerHelper(name, function() {
      var args = _.toArray(arguments),
          options = args.pop(),
          viewOptions = {
            template: options.fn,
            inverse: options.inverse,
            options: options.hash,
            parent: getParent(this._view),
            _helperName: name
          };
      options.hash.id && (viewOptions.id = options.hash.id);
      options.hash['class'] && (viewOptions.className = options.hash['class']);
      options.hash.className && (viewOptions.className = options.hash.className);
      options.hash.tag && (viewOptions.tagName = options.hash.tag);
      options.hash.tagName && (viewOptions.tagName = options.hash.tagName);
      var instance = new viewClass(viewOptions);
      args.push(instance);
      this._view.children[instance.cid] = instance;
      this._view.trigger.apply(this._view, ['helper', name].concat(args));
      this._view.trigger.apply(this._view, ['helper:' + name].concat(args));
      var htmlAttributes = Thorax.Util.htmlAttributesFromOptions(options.hash);
      htmlAttributes[viewPlaceholderAttributeName] = instance.cid;
      callback.apply(this, args);
      return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes, ''));
    });
    var helper = Handlebars.helpers[name];
    return helper;
  };
    
  //called from View.prototype.html()
  Thorax.View.prototype._appendViews = function(scope, callback) {
    (scope || this.$el).find('[' + viewPlaceholderAttributeName + ']').forEach(function(el) {
      var placeholder_id = el.getAttribute(viewPlaceholderAttributeName),
          cid = placeholder_id.replace(/\-placeholder\d+$/, ''),
          view = this.children[cid];
      //if was set with a helper
      if (_.isFunction(view)) {
        view = view.call(this._view);
      }
      if (view) {
        //see if the {{#view}} helper declared an override for the view
        //if not, ensure the view has been rendered at least once
        if (viewTemplateOverrides[placeholder_id]) {
          view.render(viewTemplateOverrides[placeholder_id](view._getContext()));
        } else {
          view.ensureRendered();
        }
        $(el).replaceWith(view.el);
        callback && callback(view.el);
      }
    }, this);
  };

  //element helper
  Handlebars.registerHelper('element', function(element, options) {
    var cid = _.uniqueId('element'),
        htmlAttributes = Thorax.Util.htmlAttributesFromOptions(options.hash);
    htmlAttributes[elementPlaceholderAttributeName] = cid;
    this._view._elementsByCid || (this._view._elementsByCid = {});
    this._view._elementsByCid[cid] = element;
    return new Handlebars.SafeString(Thorax.Util.tag.call(this, htmlAttributes));
  });
  
  Thorax.View.prototype._appendElements = function(scope, callback) {
    (scope || this.$el).find('[' + elementPlaceholderAttributeName + ']').forEach(function(el) {
      var cid = el.getAttribute(elementPlaceholderAttributeName),
          element = this._elementsByCid[cid];
      if (_.isFunction(element)) {
        element = element.call(this._view);
      }
      $(el).replaceWith(element);
      callback && callback(element);
    }, this);
  };

  //$(selector).view() helper
  $.fn.view = function(options) {
    options = _.defaults(options || {}, {
      helper: true
    });
    var selector = '[' + viewCidAttributeName + ']';
    if (!options.helper) {
      selector += ':not([' + viewHelperAttributeName + '])';
    }
    var el = $(this).closest(selector);
    return (el && Thorax._viewsIndexedByCid[el.attr(viewCidAttributeName)]) || false;
  };
  
})();