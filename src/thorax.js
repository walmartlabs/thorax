//support zepto.forEach on jQuery
if (!$.fn.forEach) {
  $.fn.forEach = function(iterator, context) {
    $.fn.each.call(this, function(index) {
      iterator.call(context || this, this, index);
    });
  }
}

var viewNameAttributeName = 'data-view-name',
    viewCidAttributeName = 'data-view-cid',
    viewPlaceholderAttributeName = 'data-view-tmp',
    viewHelperAttributeName = 'data-view-helper',
    elementPlaceholderAttributeName = 'data-element-tmp';

var Thorax = this.Thorax = {
  VERSION: '{{version}}',
  templatePathPrefix: '',
  //view instances
  _viewsIndexedByCid: {},
  templates: {},
  //view classes
  Views: {},
  //certain error prone pieces of code (on Android only it seems)
  //are wrapped in a try catch block, then trigger this handler in
  //the catch, with the name of the function or event that was
  //trying to be executed. Override this with a custom handler
  //to debug / log / etc
  onException: function(name, err) {
    throw err;
  }
};

Thorax.Util = {
  createRegistryWrapper: function(klass, hash) {
    var $super = klass.extend;
    klass.extend = function() {
      var child = $super.apply(this, arguments);
      if (child.prototype.name) {
        hash[child.prototype.name] = child;
      }
      return child;
    };
  },
  registryGet: function(object, type, name, ignoreErrors) {
    var target = object[type],
        value;
    if (name.match(/\.(?!handlebars)/)) {
      var bits = name.split(/\.(?!handlebars)/);
      name = bits.pop();
      bits.forEach(function(key) {
        target = target[key];
      });
    }
    target && (value = target[name]);
    if (!value && !ignoreErrors) {
      throw new Error(type + ': ' + name + ' does not exist.');
    } else {
      return value;
    }
  },
  getViewInstance: function(name, attributes) {
    attributes['class'] && (attributes.className = attributes['class']);
    attributes.tag && (attributes.tagName = attributes.tag);
    if (typeof name === 'string') {
      var klass = Thorax.Util.registryGet(Thorax, 'Views', name, false);
      return klass.cid ? _.extend(klass, attributes || {}) : new klass(attributes);
    } else if (typeof name === 'function') {
      return new name(attributes);
    } else {
      return name;
    }
  },

  getTemplate: function(file, ignoreErrors) {
    //append the template path prefix if it is missing
    var pathPrefix = Thorax.templatePathPrefix,
        addedExtension = false,
        template;
    if (pathPrefix && pathPrefix.length && file && file.substr(0, pathPrefix.length) !== pathPrefix) {
      file = pathPrefix + file;
    }
    file = file.replace(/\.handlebars$/, '');
    var template = Thorax.Util.registryGet(Thorax, 'templates', file, true);
    if (!template) {
      template = Thorax.Util.registryGet(Thorax, 'templates', file + '.handlebars', true);
      addedExtension = true;
    }
    if (template && typeof template === 'string') {
      template = Thorax.templates[file + addedExtension ? '.handlebars' : ''] = Handlebars.compile(template);
    }
    if (!template && !ignoreErrors) {
      throw new Error('templates: ' + file + ' does not exist.');
    }
    return template;
  },

  getValue: function (object, prop) {
    if (!(object && object[prop])) {
      return null;
    }
    return _.isFunction(object[prop])
      ? object[prop].apply(object, Array.prototype.slice.call(arguments, 2))
      : object[prop];
  },
  //'selector' is not present in $('<p></p>')
  //TODO: investigage a better detection method
  is$: function(obj) {
    return typeof obj === 'object' && ('length' in obj);
  },
  expandToken: function(input, scope) {
    {{! concatenate handlebars tokens as this file itself is a handlebars template}}
    if (input && input.indexOf && input.indexOf('{' + '{') >= 0) {
      var re = /(?:\{?[^{]+)|(?:\{\{([^}]+)\}\})/g,
          match,
          ret = [];
      function deref(token, scope) {
        if (token.match(/^("|')/) && token.match(/("|')$/)) {
          return token.replace(/(^("|')|('|")$)/g, '');
        }
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
            params = _.map(params, function(param) { return deref(param, scope); });
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
  _cloneEvents: function(source, target, key) {
    source[key] = _.clone(target[key]);
    //need to deep clone events array
    _.each(source[key], function(value, _key) {
      if (_.isArray(value)) {
        target[key][_key] = _.clone(value);
      }
    });
  }
};

Thorax.View = Backbone.View.extend({
  constructor: function() {
    var response = Backbone.View.apply(this, arguments);
    {{{override "constructor" indent=4}}}
    return response;
  },
  _configure: function(options) {
    {{{override "beforeConfigure" indent=4}}}

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
      this.template = Thorax.Util.getTemplate(this.name, true);
    }
    {{{override "configure" indent=4}}}
  },

  setElement : function() {
    var response = Backbone.View.prototype.setElement.apply(this, arguments);
    this.name && this.$el.attr(viewNameAttributeName, this.name);
    this.$el.attr(viewCidAttributeName, this.cid);
    return response;
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
    if (options.children) {
      _.each(this.children, function(child) {
        child.parent = null;
        child.destroy();
      });
      this.children = {};
    }
    {{{override "destroy" indent=4}}}
  },

  render: function(output) {
    if (typeof output === 'undefined' || (!_.isElement(output) && !Thorax.Util.is$(output) && !(output && output.el) && typeof output !== 'string' && typeof output !== 'function')) {
      if (!this.template) {
        //if the name was set after the view was created try one more time to fetch a template
        if (this.name) {
          this.template = Thorax.Util.getTemplate(this.name, true);
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
    {{#has-plugin "model"}}
      return _.extend({}, this, (this.model && this.model.attributes) || {});
    {{else}}
      return this;
    {{/has-plugin}}
  },

  _getContext: function(attributes) {
    var data = _.extend({}, Thorax.Util.getValue(this, 'context'), attributes || {}, {
      cid: _.uniqueId('t'),
      yield: function() {
        return data.fn && data.fn(data);
      },
      _view: this
    });
    return data;
  },

  renderTemplate: function(file, data, ignoreErrors) {
    var template;
    data = this._getContext(data);
    if (typeof file === 'function') {
      template = file;
    } else {
      template = Thorax.Util.getTemplate(file);
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
  
  ensureRendered: function() {
    !this._renderCount && this.render();
  },
  
  html: function(html) {
    if (typeof html === 'undefined') {
      return this.el.innerHTML;
    } else {
      var element = this.$el.html(html);
      {{#has-plugin "helpers/view"}}
        this._appendViews();
      {{/has-plugin}}
      {{#has-plugin "helpers/element"}}
        this._appendElements();
      {{/has-plugin}}
      return element;
    }
  },

  _anchorClick: function(event) {
    var target = $(event.currentTarget),
        href = target.attr('href');
    // Route anything that starts with # or / (excluding //domain urls)
    if (href && (href[0] === '#' || (href[0] === '/' && href[1] !== '/'))) {
      Backbone.history.navigate(href, {
        trigger: true
      });
      return false;
    }
    return true;
  }
});

{{! All static properties must be present before any subclasses are created}}
{{{override "static-view-properties" indent=0}}}

{{#has-plugin "event"}}
  _.extend(Thorax.View, {
    _events: [],
    on: function(eventName, callback) {
      {{{override "on" indent=4}}}
      //accept on({"rendered": handler})
      if (typeof eventName === 'object') {
        _.each(eventName, function(value, key) {
          this.on(key, value);
        }, this);
      } else {
        //accept on({"rendered": [handler, handler]})
        if (_.isArray(callback)) {
          callback.forEach(function(cb) {
            this._events.push([eventName, cb]);
          }, this);
        //accept on("rendered", handler)
        } else {
          this._events.push([eventName, callback]);
        }
      }
      return this;
    }
  });
{{/has-plugin}}


Thorax.View.extend = function() {
  var child = Backbone.View.extend.apply(this, arguments);
  {{{override "extend" indent=2}}}
  return child;
};

Thorax.Util.createRegistryWrapper(Thorax.View, Thorax.Views);

function addViewToContext(source) {
  if (this._view) {
    var context = _.clone(source);
    context._view = this._view;
    return context;
  } else {
    return source;
  }
}

//override handlebars "each" helper to provide "_view"
Handlebars.registerHelper('each', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  var ret = "";
  if (context && context.length > 0) {
    for (var i = 0, j = context.length; i < j; i++) {
      ret = ret + fn(addViewToContext.call(this, context[i]));
    }
  } else {
    ret = inverse(this);
  }
  return ret;
});

//override handlebars "with" helper to provide "_view"
Handlebars.registerHelper('with', function(context, options) {
  return options.fn(addViewToContext.call(this, context));
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
