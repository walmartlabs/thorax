// Copyright (c) 2011-2012 @WalmartLabs
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.
// 
(function() {

// Begin "src/thorax.js"
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
  VERSION: '2.0.0b6',
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
      _.each(bits, function(key) {
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
    
    // Begin injected code from "src/model.js"
    if (this.model) {
      //need to null this.model so setModel will not treat
      //it as the old model and immediately return
      var model = this.model;
      this.model = null;
      this.setModel(model);
    }
      // End injected code
    return response;
  },
  _configure: function(options) {
    
    // Begin injected code from "src/model.js"
    this._modelOptionsByCid = {};
    this._modelEvents = [];
    this._models = [];
    // End injected code
    // Begin injected code from "src/collection.js"
    this._collectionEvents = [];
    this._collectionOptionsByCid = {};
    this._collections = [];
      // End injected code

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
    
    // Begin injected code from "src/mixin.js"
    //HelperView will not have mixins so need to check
    this.constructor.mixins && _.each(this.constructor.mixins, this.mixin, this);
    this.mixins && _.each(this.mixins, this.mixin, this);
    // End injected code
    // Begin injected code from "src/event.js"
    //_events not present on HelperView
    this.constructor._events && _.each(this.constructor._events, function(event) {
      this.on.apply(this, event);
    }, this);
    if (this.events) {
      _.each(Thorax.Util.getValue(this, 'events'), function(handler, eventName) {
        this.on(eventName, handler, this);
      }, this);
    }
      // End injected code
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
    
    // Begin injected code from "src/event.js"
    this.freeze();
      // End injected code
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
    
      return _.extend({}, this, (this.model && this.model.attributes) || {});
    
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
      
        this._appendViews();
      
      
        this._appendElements();
      
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



  // Begin injected code from "src/mixin.js"
  _.extend(Thorax.View, {
    mixins: [],
    mixin: function(mixin) {
      this.mixins.push(mixin);
    },
    registerMixin: function(name, callback, methods) {
      Thorax.Mixins[name] = [callback, methods];
    }
  });
  // End injected code
  // Begin injected code from "src/model.js"
  Thorax.View._modelEvents = [];
  // End injected code
  // Begin injected code from "src/collection.js"
  Thorax.View._collectionEvents = [];
  // End injected code


  _.extend(Thorax.View, {
    _events: [],
    on: function(eventName, callback) {
      
    // Begin injected code from "src/model.js"
    if (eventName === 'model' && typeof callback === 'object') {
      return addEvents(this._modelEvents, callback);
    }
    // End injected code
    // Begin injected code from "src/collection.js"
    if (eventName === 'collection' && typeof callback === 'object') {
      return addEvents(this._collectionEvents, callback);
    }
      // End injected code
      //accept on({"rendered": handler})
      if (typeof eventName === 'object') {
        _.each(eventName, function(value, key) {
          this.on(key, value);
        }, this);
      } else {
        //accept on({"rendered": [handler, handler]})
        if (_.isArray(callback)) {
          _.each(callback, function(cb) {
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



Thorax.View.extend = function() {
  var child = Backbone.View.extend.apply(this, arguments);
  
  // Begin injected code from "src/mixin.js"
  child.mixins = _.clone(this.mixins);
  // End injected code
  // Begin injected code from "src/event.js"
  Thorax.Util._cloneEvents(this, child, '_events');
  // End injected code
  // Begin injected code from "src/model.js"
  Thorax.Util._cloneEvents(this, child, '_modelEvents');
  // End injected code
  // Begin injected code from "src/collection.js"
  Thorax.Util._cloneEvents(this, child, '_collectionEvents');
    // End injected code
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
  var ret = "", data;

  if (options.data) {
    data = Handlebars.createFrame(options.data);
  }

  if (context && context.length > 0) {
    for (var i = 0, j = context.length; i < j; i++) {
      if (data) { data.index = i; }
      ret = ret + fn(addViewToContext.call(this, context[i]), { data: data });
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


// End "src/thorax.js"

// Begin "src/mixin.js"
Thorax.Mixins = {};







Thorax.View.prototype.mixin = function(name) {
  if (!this._appliedMixins) {
    this._appliedMixins = [];
  }
  if (this._appliedMixins.indexOf(name) == -1) {
    this._appliedMixins.push(name);
    if (typeof name === 'function') {
      name.call(this);
    } else {
      var mixin = Thorax.Mixins[name];
      _.extend(this, mixin[1]);
      //mixin callback may be an array of [callback, arguments]
      if (_.isArray(mixin[0])) {
        mixin[0][0].apply(this, mixin[0][1]);
      } else {
        mixin[0].apply(this, _.toArray(arguments).slice(1));
      }
    }
  }
};

function applyMixin(mixin) {
  if (_.isArray(mixin)) {
    this.mixin.apply(this, mixin);
  } else {
    this.mixin(mixin);
  }
}


// End "src/mixin.js"

// Begin "src/event.js"
var _on = Thorax.View.prototype.on,
    _delegateEvents = Thorax.View.prototype.delegateEvents;







_.extend(Thorax.View.prototype, {
  freeze: function(options) {
    
    // Begin injected code from "src/model.js"
    _.each(this._models, this.unbindModel, this);
    // End injected code
    // Begin injected code from "src/collection.js"
    _.each(this._collections, this.unbindCollection, this);
      // End injected code
    options = _.defaults(options || {}, {
      dom: true,
      children: true
    });
    this._eventArgumentsToUnbind && _.each(this._eventArgumentsToUnbind, function(args) {
      args[0].off(args[1], args[2], args[3]);
    });
    this._eventArgumentsToUnbind = [];
    this.off();
    if (options.dom) {
      this.undelegateEvents();
    }
    this.trigger('freeze');
    if (options.children) {
      _.each(this.children, function(child, id) {
        child.freeze(options);
      }, this);
    }
  },
  on: function(eventName, callback, context) {
    
    // Begin injected code from "src/model.js"
    if (eventName === 'model' && typeof callback === 'object') {
      return addEvents(this._modelEvents, callback);
    }
    // End injected code
    // Begin injected code from "src/collection.js"
    if (eventName === 'collection' && typeof callback === 'object') {
      return addEvents(this._collectionEvents, callback);
    }
      // End injected code
    if (typeof eventName === 'object') {
      //accept on({"rendered": callback})
      if (arguments.length === 1) {
        _.each(eventName, function(value, key) {
          this.on(key, value, this);
        }, this);
      //events on other objects to auto dispose of when view frozen
      //on(targetObj, 'eventName', callback, context)
      } else if (arguments.length > 1) {
        if (!this._eventArgumentsToUnbind) {
          this._eventArgumentsToUnbind = [];
        }
        var args = Array.prototype.slice.call(arguments);
        this._eventArgumentsToUnbind.push(args);
        args[0].on.apply(args[0], args.slice(1));
      }
    } else {
      //accept on("rendered", callback, context)
      //accept on("click a", callback, context)
      _.each((_.isArray(callback) ? callback : [callback]), function(callback) {
        var params = eventParamsFromEventItem.call(this, eventName, callback, context || this);
        if (params.type === 'DOM') {
          //will call _addEvent during delegateEvents()
          if (!this._eventsToDelegate) {
            this._eventsToDelegate = [];
          }
          this._eventsToDelegate.push(params);
        } else {
          this._addEvent(params);
        }
      }, this);
    }
    return this;
  },
  delegateEvents: function(events) {
    this.undelegateEvents();
    if (events) {
      if (_.isFunction(events)) {
        events = events.call(this);
      }
      this._eventsToDelegate = [];
      this.on(events);
    }
    this._eventsToDelegate && _.each(this._eventsToDelegate, this._addEvent, this);
  },
  //params may contain:
  //- name
  //- originalName
  //- selector
  //- type "view" || "DOM"
  //- handler
  _addEvent: function(params) {
    if (params.type === 'view') {
      _.each(params.name.split(/\s+/), function(name) {
        _on.call(this, name, bindEventHandler.call(this, 'view-event:' + params.originalName, params.handler), params.context || this);
      }, this);
    } else {
      var boundHandler = bindEventHandler.call(this, 'dom-event:' + params.originalName, params.handler);
      if (!params.nested) {
        boundHandler = containHandlerToCurentView(boundHandler, this.cid);
      }
      if (params.selector) {
        var name = params.name + '.delegateEvents' + this.cid;
        this.$el.on(name, params.selector, boundHandler);
      } else {
        this.$el.on(params.name, boundHandler);
      }
    }
  }
});

var eventSplitter = /^(nested\s+)?(\S+)(?:\s+(.+))?/;

var domEvents = [
  'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout',
  'touchstart', 'touchend', 'touchmove',
  'click', 'dblclick',
  'keyup', 'keydown', 'keypress',
  'submit', 'change',
  'focus', 'blur'
  
];
var domEventRegexp = new RegExp('^(' + domEvents.join('|') + ')');

function containHandlerToCurentView(handler, cid) {
  return function(event) {
    var view = $(event.target).view({helper: false});
    if (view && view.cid == cid) {
      event.originalContext = this;
      handler(event);
    }
  }
}

function bindEventHandler(eventName, callback) {
  var method = typeof callback === 'function' ? callback : this[callback];
  if (!method) {
    throw new Error('Event "' + callback + '" does not exist ' + (this.name || this.cid) + ':' + eventName);
  }
  return _.bind(function() {
    try {
      method.apply(this, arguments);
    } catch (e) {
      Thorax.onException('thorax-exception: ' + (this.name || this.cid) + ':' + eventName, e);
    }
  }, this);
}

function eventParamsFromEventItem(name, handler, context) {
  var params = {
    originalName: name,
    handler: typeof handler === 'string' ? this[handler] : handler
  };
  if (name.match(domEventRegexp)) {
    var match = eventSplitter.exec(name);
    params.nested = !!match[1];
    params.name = match[2];
    params.type = 'DOM';
    params.selector = match[3];
  } else {
    params.name = name;
    params.type = 'view';
  }
  params.context = context;
  return params;
}


// End "src/event.js"

// Begin "src/model.js"
var modelCidAttributeName = 'data-model-cid',
    modelNameAttributeName = 'data-model-name';

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
    return keys.length > 1 || (keys.length === 1 && keys[0] !== 'id');
  }
});

Thorax.Models = {};
Thorax.Util.createRegistryWrapper(Thorax.Model, Thorax.Models);














function addEvents(target, source) {
  _.each(source, function(callback, eventName) {
    if (_.isArray(callback)) {
      _.each(callback, function(cb) {
        target.push([eventName, cb]);
      }, this);
    } else {
      target.push([eventName, callback]);
    }
  });
}

_.extend(Thorax.View.prototype, {
  bindModel: function(model, options) {
    this._models.push(model);
    var modelOptions = this._setModelOptions(model, options);
    bindEvents.call(this, model, this.constructor._modelEvents);
    bindEvents.call(this, model, this._modelEvents);
    if (Thorax.Util.shouldFetch(this.model, modelOptions)) {
      var success = modelOptions.success;
      this._loadModel(this.model, modelOptions);
    } else {
      //want to trigger built in event handler (render() + populate())
      //without triggering event on model
      this._onModelChange(model);
    }
  },
  unbindModel: function(model) {
    this._models = _.without(this._models, model);
    model.trigger('freeze');
    unbindEvents.call(this, model, this.constructor._modelEvents);
    unbindEvents.call(this, model, this._modelEvents);
    delete this._modelOptionsByCid[model.cid];
  },
  setModel: function(model, options) {
    var oldModel = this.model;
    if (model === oldModel) {
      return this;
    }
    if (oldModel) {
      this.unbindModel(oldModel);
    }
    if (model) {
      this.$el.attr(modelCidAttributeName, model.cid);
      model.name && this.$el.attr(modelNameAttributeName, model.name);
      this.model = model;
      this.bindModel(model, options);
      this.model.trigger('set', this.model, oldModel);
    } else {
      this.model = false;
      this._onModelChange(false);
      this.$el.removeAttr(modelCidAttributeName);
      this.$el.attr(modelNameAttributeName);
    }
    return this;
  },
  _onModelChange: function(model) {
    var modelOptions = model && this._modelOptionsByCid[model.cid];
    // !modelOptions will be true when setModel(false) is called
    if (!modelOptions || (modelOptions && modelOptions.render)) {
      this.render();
    }
    
    // Begin injected code from "src/form.js"
    if (modelOptions && modelOptions.populate) {
      this.populate(model.attributes, modelOptions.populate === true ? {} : modelOptions.populate);
    }
      // End injected code
  },
  _loadModel: function(model, options) {
    
      if (model.load) {
        model.load(function() {
          options && options.success && options.success(model);
        }, options);
      } else {
        model.fetch(options);
      }
    
  },
  _setModelOptions: function(model, options) {
    if (!this._modelOptionsByCid[model.cid]) {
      this._modelOptionsByCid[model.cid] = {
        fetch: true,
        success: false,
        render: true,
        errors: true
            
        // Begin injected code from "src/form.js"
        , populate: true 
        // End injected code
        // Begin injected code from "src/loading.js"
        , ignoreErrors: this.ignoreFetchError
        , background: this.nonBlockingLoad
          // End injected code
      };
    }
    _.extend(this._modelOptionsByCid[model.cid], options || {});
    return this._modelOptionsByCid[model.cid];
  }
});

function getEventCallback(callback, context) {
  if (typeof callback === 'function') {
    return callback;
  } else {
    return context[callback];
  }
}

function bindEvents(target, events) {
  _.each(events, function(event) {
    // getEventCallback will resolve if it is a string or a method
    // and return a method
    target.on(event[0], getEventCallback(event[1], this), event[2] || this);
  }, this);
}

function unbindEvents(target, events) {
  _.each(events, function(event) {
    target.off(event[0], getEventCallback(event[1], this), event[2] || this);
  }, this);
}

Thorax.View.on({
  model: {
    error: function(model, errors){
      if (this._modelOptionsByCid[model.cid].errors) {
        this.trigger('error', errors, model);
      }
    },
    change: function(model) {
      this._onModelChange(model);
    }
  }
});

Thorax.Util.shouldFetch = function(modelOrCollection, options) {
  var getValue = Thorax.Util.getValue,
      isCollection = !modelOrCollection.collection && modelOrCollection._byCid && modelOrCollection._byId;
      url = (
        (!modelOrCollection.collection && getValue(modelOrCollection, 'urlRoot')) ||
        (modelOrCollection.collection && getValue(modelOrCollection.collection, 'url')) ||
        (isCollection && getValue(modelOrCollection, 'url'))
      );
  return url && options.fetch && !(
    (modelOrCollection.isPopulated && modelOrCollection.isPopulated()) ||
    (isCollection
      ? Thorax.Collection && Thorax.Collection.prototype.isPopulated.call(modelOrCollection)
      : Thorax.Model.prototype.isPopulated.call(modelOrCollection)
    )
  );
};

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


// End "src/model.js"

// Begin "src/collection.js"
var _fetch = Backbone.Collection.prototype.fetch,
    _reset = Backbone.Collection.prototype.reset,
    collectionCidAttributeName = 'data-collection-cid',
    collectionNameAttributeName = 'data-collection-name',
    collectionEmptyAttributeName = 'data-collection-empty',
    ELEMENT_NODE_TYPE = 1;

Thorax.Collection = Backbone.Collection.extend({
  model: Thorax.Model || Backbone.Model,
  isEmpty: function() {
    if (this.length > 0) {
      return false;
    } else {
      return this.length === 0 && this.isPopulated();
    }
  },
  isPopulated: function() {
    return this._fetched || this.length > 0 || (!this.length && !Thorax.Util.getValue(this, 'url'));
  },
  fetch: function(options) {
    options = options || {};
    var success = options.success;
    options.success = function(collection, response) {
      collection._fetched = true;
      success && success(collection, response);
    };
    return _fetch.apply(this, arguments);
  },
  reset: function(models, options) {
    this._fetched = !!models;
    return _reset.call(this, models, options);
  }
});

Thorax.Collections = {};
Thorax.Util.createRegistryWrapper(Thorax.Collection, Thorax.Collections);











_.extend(Thorax.View.prototype, {
  bindCollection: function(collection, options) {
    // Collections do not have a cid attribute by default
    collection.cid = collection.cid || _.uniqueId('collection');
    this._collections.push(collection);
    var collectionOptions = this._setCollectionOptions(collection, options);
    bindEvents.call(this, collection, this.constructor._collectionEvents);
    bindEvents.call(this, collection, this._collectionEvents);
    if (Thorax.Util.shouldFetch(collection, collectionOptions)) {
      this._loadCollection(collection);
    } else if (collectionOptions.render) {
      //want to trigger built in event handler (render())
      //without triggering event on collection
      this.render();
    }
  },
  unbindCollection: function(collection) {
    this._collections = _.without(this._collections, collection);
    collection.trigger('freeze');
    unbindEvents.call(this, collection, this.constructor._collectionEvents);
    unbindEvents.call(this, collection, this._collectionEvents);
    delete this._collectionOptionsByCid[collection.cid];
  },
  _setCollectionOptions: function(collection, options) {
    return this._collectionOptionsByCid[collection.cid] = _.extend({
      render: true,
      fetch: true,
      success: false,
      errors: true
        
      // Begin injected code from "src/loading.js"
      , ignoreErrors: this.ignoreFetchError
      , background: this.nonBlockingLoad
        // End injected code
    }, options || {});
  },
  _loadCollection: function(collection) {
    
      if (collection.load) {
        collection.load(function(){
          options && options.success && options.success(collection);
        }, options);
      } else {
        collection.fetch(options);
      }
    
  }
});

Thorax.CollectionView = Thorax.HelperView.extend({
  constructor: function(options) {
    Thorax.CollectionView.__super__.constructor.call(this, options);
    if (!this.parent) {
      throw new Error("CollectionView requires a 'parent' view to be set");
    }
    //collection helper will initialize this.options, so need to mimic
    this.options || (this.options = {});
    _.each(collectionOptionNames, function(optionName) {
      options[optionName] && (this.options[optionName] = options[optionName]);
    }, this);
    configureCollectionViewOptions(this);
    this.collection && this.setCollection(this.collection);
  },
  setCollection: function(collection, options) {
    if (collection) {
      this.collection = collection;
      
        addLoadingBehaviors.call(this);
      
      this.bindCollection(collection, _.extend({}, this.options, options));
      this.$el.attr(collectionCidAttributeName, collection.cid);
      collection.name && this.$el.attr(collectionNameAttributeName, collection.name);
      collection.trigger('set', collection);
    } else {
      this.collection && this.unbindCollection(this.collection);
      this.collection = false;
      this.$el.removeAttr(collectionCidAttributeName);
      this.$el.removeAttr(collectionNameAttributeName);
    }
    return this;
  },
  //appendItem(model [,index])
  //appendItem(html_string, index)
  //appendItem(view, index)
  appendItem: function(model, index, options) {
    //empty item
    if (!model) {
      return;
    }
    var itemView;
    options = options || {};
    //if index argument is a view
    index && index.el && (index = this.$el.children().indexOf(index.el) + 1);
    //if argument is a view, or html string
    if (model.el || typeof model === 'string') {
      itemView = model;
      model = false;
    } else {
      index = index || this.collection.indexOf(model) || 0;
      itemView = this.renderItem(model, index);
    }
    if (itemView) {
      itemView.cid && this._addChild(itemView);
      //if the renderer's output wasn't contained in a tag, wrap it in a div
      //plain text, or a mixture of top level text nodes and element nodes
      //will get wrapped
      if (typeof itemView === 'string' && !itemView.match(/^\s*\</m)) {
        itemView = '<div>' + itemView + '</div>'
      }
      var itemElement = itemView.el ? [itemView.el] : _.filter($(itemView), function(node) {
        //filter out top level whitespace nodes
        return node.nodeType === ELEMENT_NODE_TYPE;
      });
      model && $(itemElement).attr(modelCidAttributeName, model.cid);
      var previousModel = index > 0 ? this.collection.at(index - 1) : false;
      if (!previousModel) {
        this.$el.prepend(itemElement);
      } else {
        //use last() as appendItem can accept multiple nodes from a template
        var last = this.$el.find('[' + modelCidAttributeName + '="' + previousModel.cid + '"]').last();
        last.after(itemElement);
      }
      
        this._appendViews(null, function(el) {
          el.setAttribute(modelCidAttributeName, model.cid);
        });
      
      
        this._appendElements(null, function(el) {
          el.setAttribute(modelCidAttributeName, model.cid);
        });
      
      !options.silent && this.parent.trigger('rendered:item', this, this.collection, model, itemElement, index);
      applyItemVisiblityFilter.call(this, model);
    }
    return itemView;
  },
  //updateItem only useful if there is no item view, otherwise
  //itemView.render() provideds the same functionality
  updateItem: function(model) {
    this.removeItem(model);
    this.appendItem(model);
  },
  removeItem: function(model) {
    var viewEl = this.$('[' + modelCidAttributeName + '="' + model.cid + '"]');
    if (!viewEl.length) {
      return false;
    }
    var viewCid = viewEl.attr(viewCidAttributeName);
    if (this.children[viewCid]) {
      delete this.children[viewCid];
    }
    viewEl.remove();
    return true;
  },
  render: function() {
    if (this.collection) {
      if (this.collection.isEmpty()) {
        handleChangeFromNotEmptyToEmpty.call(this);
      } else {
        handleChangeFromEmptyToNotEmpty.call(this);
        this.collection.forEach(function(item, i) {
          this.appendItem(item, i);
        }, this);
      }
      this.parent.trigger('rendered:collection', this, this.collection);
      applyVisibilityFilter.call(this);
    } else {
      handleChangeFromNotEmptyToEmpty.call(this);
    }
    ++this._renderCount;
  },
  renderEmpty: function() {
    var viewOptions = {},
        emptyView = this.options['empty-view'],
        emptyContext = this.options['empty-context'],
        emptyTemplate = this.options['empty-template'];
    function getEmptyContext() {
      return (_.isFunction(emptyContext)
        ? emptyContext
        : this.parent[emptyContext]
      ).call(this.parent);
    }
    if (emptyView) {
      var viewOptions = {};
      emptyContext && (viewOptions.context = _.bind(getEmptyContext, this));
      var view = Thorax.Util.getViewInstance(emptyView, viewOptions);
      if (emptyTemplate) {
        view.render(this.renderTemplate(emptyTemplate, viewOptions.context ? viewOptions.context() : this.parent.context()));
      } else {
        view.render();
      }
      return view;
    } else {
      var emptyTemplate = emptyTemplate || (this.parent.name && Thorax.Util.getTemplate(this.parent.name + '-empty', true)),
          context;
      context = emptyContext ? getEmptyContext.call(this) : this.parent.context();
      return emptyTemplate && this.renderTemplate(emptyTemplate, context);
    }
  },
  renderItem: function(model, i) {
    var itemView = this.options['item-view'],
        itemTemplate = this.options['item-template'],
        itemContext = this.options['item-context'];
    function getItemContext() {
      return (_.isFunction(itemContext)
        ? itemContext
        : this.parent[itemContext]
      ).call(this.parent, model, i);
    }
    if (itemView) {
      var viewOptions = {
        model: model
      };
      itemContext && (viewOptions.context = _.bind(getItemContext, this));
      itemTemplate && (viewOptions.template = itemTemplate);
      var view = Thorax.Util.getViewInstance(itemView, viewOptions);
      view.ensureRendered();
      return view;
    } else {
      itemTemplate = itemTemplate || (this.parent.name && Thorax.Util.getTemplate(this.parent.name + '-item', true));
      if (!itemTemplate) {
        throw new Error('collection helper in View: ' + (this.parent.name || this.parent.cid) + ' requires an item template.');
      }
      return this.renderTemplate(itemTemplate, itemContext ? getItemContext.call(this) : model.attributes);
    }
  },
  appendEmpty: function() {
    this.$el.empty();
    var emptyContent = this.renderEmpty();
    emptyContent && this.appendItem(emptyContent, 0, {
      silent: true
    });
    this.parent.trigger('rendered:empty', this, this.collection);
  }
});

var collectionOptionNames = [
  'item-template',
  'empty-template',
  'item-view',
  'empty-view',
  'item-context',
  'empty-context',
  'empty-class',
  'filter'
  
  , 'loading-template'
  , 'loading-view'
  , 'loading-placement'
  
];

function applyVisibilityFilter() {
  if (this.options.filter) {
    this.collection.forEach(function(model) {
      applyItemVisiblityFilter.call(this, model);
    }, this);
  }
}

function applyItemVisiblityFilter(model) {
  if (this.options.filter) {
    $('[' + modelCidAttributeName + '="' + model.cid + '"]')[itemShouldBeVisible.call(this, model) ? 'show' : 'hide']();
  }
}

function itemShouldBeVisible(model, i) {
  return (typeof this.options.filter === 'string'
    ? this.parent[this.options.filter]
    : this.options.filter).call(this.parent, model, this.collection.indexOf(model))
  ;
}

function handleChangeFromEmptyToNotEmpty() {
  this.options['empty-class'] && this.$el.removeClass(this.options['empty-class']);
  this.$el.removeAttr(collectionEmptyAttributeName);
  this.$el.empty();
}

function handleChangeFromNotEmptyToEmpty() {
  this.options['empty-class'] && this.$el.addClass(this.options['empty-class']);
  this.$el.attr(collectionEmptyAttributeName, true);
  this.appendEmpty();
}

var sharedCollectionEvents = {
  collection: {
    reset: function(collection) {
      var options = this._collectionOptionsByCid[collection.cid];
      options.render && this.render();
    },
    error: function(collection, message) {
      var options = this._collectionOptionsByCid[collection.cid];
      options.errors && this.trigger('error', message);
    }
  }
};

// Sub-classes have already been declared, so need
// to call `on` on all classes that should get the
// events
Thorax.View.on(sharedCollectionEvents);
Thorax.HelperView.on(sharedCollectionEvents);
Thorax.CollectionView.on(sharedCollectionEvents);

Thorax.CollectionView.on({
  collection: {
    filter: function() {
      applyVisibilityFilter.call(this);
    },
    change: function(model) {
      //if we rendered with item views, model changes will be observed
      //by the generated item view but if we rendered with templates
      //then model changes need to be bound as nothing is watching
      if (!this.options['item-view']) {
        this.updateItem(model);
      }
      applyItemVisiblityFilter.call(this, model);
    },
    add: function(model, collection) {
      this.collection.length === 1 && this.$el.length && handleChangeFromEmptyToNotEmpty.call(this);
      if (this.$el.length) {
        var index = collection.indexOf(model);
        this.appendItem(model, index);
      }
    },
    remove: function(model, collection) {
      this.$el.find('[' + modelCidAttributeName + '="' + model.cid + '"]').remove();
      for (var cid in this.children) {
        if (this.children[cid].model && this.children[cid].model.cid === model.cid) {
          this.children[cid].destroy();
          delete this.children[cid];
          break;
        }
      }
      this.collection.length === 0 && this.$el.length && handleChangeFromNotEmptyToEmpty.call(this);
    }
    // collection.reset event registered in Thorax.View class
  }
});

//item-template and empty-template are configured in the collection helper
function configureCollectionViewOptions(view) {
  _.extend(view.options, {
    'item-context': view.options['item-context'] || view.parent.itemContext,
    'empty-context': view.options['empty-context'] || view.parent.emptyContext,
    'empty-class': ('empty-class' in view.options) ? view.options['empty-class'] : 'empty'
  });
}


  function addLoadingBehaviors() {
    var loadingView = this.options['loading-view'],
        loadingTemplate = this.options['loading-template'],
        loadingPlacement = this.options['loading-placement'];
    //add "loading-view" and "loading-template" options to collection helper
    if (loadingView || loadingTemplate) {
      var callback = Thorax.loadHandler(_.bind(function() {
        var item;
        if (this.collection.length === 0) {
          this.$el.empty();
        }
        if (loadingView) {
          var instance = Thorax.Util.getViewInstance(loadingView, {
            collection: this.collection
          });
          this._addChild(instance);
          if (loadingTemplate) {
            instance.render(loadingTemplate);
          } else {
            instance.render();
          }
          item = instance;
        } else {
          item = this.renderTemplate(loadingTemplate, {
            collection: this.collection
          });
        }
        var index = loadingPlacement
          ? loadingPlacement.call(this.parent, this)
          : this.collection.length
        ;
        this.appendItem(item, index);
        this.$el.children().eq(index).attr('data-loading-element', this.collection.cid);
      }, this), _.bind(function() {
        this.$el.find('[data-loading-element="' + this.collection.cid + '"]').remove();
      }, this));
      this.on(this.collection, 'load:start', callback);
    }
  }


//$(selector).collection() helper
$.fn.collection = function(view) {
  var $this = $(this),
      collectionElement = $this.closest('[' + collectionCidAttributeName + ']'),
      collectionCid = collectionElement && collectionElement.attr(collectionCidAttributeName);
  if (collectionCid) {
    view = view || $this.view();
    if (view) {
      return view.collection;
    }
  }
  return false;
};


// End "src/collection.js"

// Begin "src/form.js"




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
      if (!this.model.set(attributes, {silent: options.silent})) {
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
  populate: function(attributes, options) {
    options = _.extend({
      children: true
    }, options || {});
    var value, attributes = attributes || this._getContext(this.model);
    //callback has context of element
    eachNamedInput.call(this, options, function() {
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
});

function eachNamedInput(options, iterator, context) {
  var i = 0, cid = this.cid;
  this.$('select,input,textarea', options.root || this.el).each(function() {
    if (!options.children) {
      var closestViewEl = $(this).closest('[ '+ viewCidAttributeName + ']:not([' + viewHelperAttributeName + '])');
      if (cid !== closestViewEl.attr(viewCidAttributeName)) {
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


// End "src/form.js"

// Begin "src/view-controller.js"
//Router
function initializeRouter() {
  Backbone.history || (Backbone.history = new Backbone.History);
  Backbone.history.on('route', onRoute, this);
  //router does not have a built in destroy event
  //but ViewController does
  this.on('destroyed', function() {
    Backbone.history.off('route', onRoute, this);
  });
}

Thorax.Router = Backbone.Router.extend({
  constructor: function() {
    var response = Thorax.Router.__super__.constructor.apply(this, arguments);
    initializeRouter.call(this);
    return response;
  },
  route: function(route, name, callback) {
    //add a route:before event that is fired before the callback is called
    return Backbone.Router.prototype.route.call(this, route, name, function() {
      this.trigger.apply(this, ['route:before', name].concat(Array.prototype.slice.call(arguments)));
      return callback.apply(this, arguments);
    });
  }
});

Thorax.Routers = {};
Thorax.Util.createRegistryWrapper(Thorax.Router, Thorax.Routers);

function onRoute(router, name) {
  if (this === router) {
    this.trigger.apply(this, ['route'].concat(Array.prototype.slice.call(arguments, 1)));
  }
}

//layout
var layoutCidAttributeName = 'data-layout-cid';

Thorax.LayoutView = Thorax.View.extend({
  render: function(output) {
    //TODO: fixme, lumbar inserts templates after JS, most of the time this is fine
    //but Application will be created in init.js (unlike most views)
    //so need to put this here so the template will be picked up
    var layoutTemplate;
    if (this.name) {
      layoutTemplate = Thorax.Util.getTemplate(this.name, true);
    }
    //a template is optional in a layout
    if (output || this.template || layoutTemplate) {
      //but if present, it must have embedded an element containing layoutCidAttributeName 
      var response = Thorax.View.prototype.render.call(this, output || this.template || layoutTemplate);
      ensureLayoutViewsTargetElement.call(this);
      return response;
    } else {
      ensureLayoutCid.call(this);
    }
  },
  setView: function(view, options) {
    options = _.extend({
      scroll: true,
      destroy: true
    }, options || {});
    if (typeof view === 'string') {
      view = new (Thorax.Util.registryGet(Thorax, 'Views', view, false));
    }
    this.ensureRendered();
    var oldView = this._view;
    if (view == oldView){
      return false;
    }
    if (options.destroy && view) {
      view._shouldDestroyOnNextSetView = true;
    }
    this.trigger('change:view:start', view, oldView, options);
    oldView && oldView.trigger('deactivated', options);
    view && view.trigger('activated', options);
    if (oldView && oldView.el && oldView.el.parentNode) {
      oldView.$el.remove();
    }
    //make sure the view has been rendered at least once
    view && this._addChild(view);
    view && view.ensureRendered();
    view && getLayoutViewsTargetElement.call(this).appendChild(view.el);
    this._view = view;
    oldView && (delete this.children[oldView.cid]);
    oldView && oldView._shouldDestroyOnNextSetView && oldView.destroy();
    
    this._view && this._view.trigger('ready', options);
    this.trigger('change:view:end', view, oldView, options);
    return view;
  },

  getView: function() {
    return this._view;
  }
});

Handlebars.registerHelper('layout', function(options) {
  options.hash[layoutCidAttributeName] = this._view.cid;
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, '', this));
});

function ensureLayoutCid() {
  ++this._renderCount;
  //set the layoutCidAttributeName on this.$el if there was no template
  this.$el.attr(layoutCidAttributeName, this.cid);
}

function ensureLayoutViewsTargetElement() {
  if (!this.$('[' + layoutCidAttributeName + '="' + this.cid + '"]')[0]) {
    throw new Error('No layout element found in ' + (this.name || this.cid));
  }
}

function getLayoutViewsTargetElement() {
  return this.$('[' + layoutCidAttributeName + '="' + this.cid + '"]')[0] || this.el[0] || this.el;
}

//ViewController
Thorax.ViewController = Thorax.LayoutView.extend({
  constructor: function() {
    var response = Thorax.ViewController.__super__.constructor.apply(this, arguments);
    this._bindRoutes();
    initializeRouter.call(this);
    //set the ViewController as the view on the parent
    //if a parent was specified
    this.on('route:before', function(router, name) {
      if (this.parent && this.parent.getView) {
        if (this.parent.getView() !== this) {
          this.parent.setView(this, {
            destroy: false
          });
        }
      }
    }, this);
    return response;
  }
});
_.extend(Thorax.ViewController.prototype, Thorax.Router.prototype);


// End "src/view-controller.js"

// Begin "src/loading.js"
var loadStart = 'load:start',
    loadEnd = 'load:end',
    rootObject;

Thorax.setRootObject = function(obj) {
  rootObject = obj;
};

Thorax.loadHandler = function(start, end) {
  return function(message, background, object) {
    var self = this;

    function startLoadTimeout() {
      clearTimeout(self._loadStart.timeout);
      self._loadStart.timeout = setTimeout(function() {
          try {
            self._loadStart.run = true;
            start.call(self, self._loadStart.message, self._loadStart.background, self._loadStart);
          } catch(e) {
            Thorax.onException('loadStart', e);
          }
        },
        loadingTimeout*1000);
    }

    if (!self._loadStart) {
      var loadingTimeout = self._loadingTimeoutDuration;
      if (loadingTimeout === void 0) {
        // If we are running on a non-view object pull the default timeout
        loadingTimeout = Thorax.View.prototype._loadingTimeoutDuration;
      }

      self._loadStart = _.extend({
        events: [],
        timeout: 0,
        message: message,
        background: !!background
      }, Backbone.Events);
      startLoadTimeout();
    } else {
      clearTimeout(self._loadStart.endTimeout);

      self._loadStart.message = message;
      if (!background && self._loadStart.background) {
        self._loadStart.background = false;
        startLoadTimeout();
      }
    }

    self._loadStart.events.push(object);
    object.on(loadEnd, function endCallback() {
      object.off(loadEnd, endCallback);

      var loadingEndTimeout = self._loadingTimeoutEndDuration;
      if (loadingEndTimeout === void 0) {
        // If we are running on a non-view object pull the default timeout
        loadingEndTimeout = Thorax.View.prototype._loadingTimeoutEndDuration;
      }

      var events = self._loadStart.events,
          index = events.indexOf(object);
      if (index >= 0) {
        events.splice(index, 1);
      }
      if (!events.length) {
        self._loadStart.endTimeout = setTimeout(function() {
          try {
            if (!events.length) {
              var run = self._loadStart.run;
  
              if (run) {
                // Emit the end behavior, but only if there is a paired start
                end.call(self, self._loadStart.background, self._loadStart);
                self._loadStart.trigger(loadEnd, self._loadStart);
              }
  
              // If stopping make sure we don't run a start
              clearTimeout(self._loadStart.timeout);
              self._loadStart = undefined;
            }
          } catch(e) {
            Thorax.onException('loadEnd', e);
          }
        }, loadingEndTimeout * 1000);
      }
    });
  };
};

/**
 * Helper method for propagating load:start events to other objects.
 *
 * Forwards load:start events that occur on `source` to `dest`.
 */
Thorax.forwardLoadEvents = function(source, dest, once) {
  function load(message, backgound, object) {
    if (once) {
      source.off(loadStart, load);
    }
    dest.trigger(loadStart, message, backgound, object);
  }
  source.on(loadStart, load);
  return {
    off: function() {
      source.off(loadStart, load);
    }
  };
};

//
// Data load event generation
//

/**
 * Mixing for generating load:start and load:end events.
 */
Thorax.mixinLoadable = function(target, useParent) {
  _.extend(target, {  
    //loading config
    _loadingClassName: 'loading',
    _loadingTimeoutDuration: 0.33,
    _loadingTimeoutEndDuration: 0.10,
  
    // Propagates loading view parameters to the AJAX layer
    onLoadStart: function(message, background, object) {
      var that = useParent ? this.parent : this;
      if (!that.nonBlockingLoad && !background && rootObject) {
        rootObject.trigger(loadStart, message, background, object);
      }
      $(that.el).addClass(that._loadingClassName);
      //used by loading helpers
      if (that._loadingCallbacks) {
        _.each(that._loadingCallbacks, function(callback) {
          callback();
        });
      }
    },
    onLoadEnd: function(background, object) {
      var that = useParent ? this.parent : this;
      $(that.el).removeClass(that._loadingClassName);
      //used by loading helpers
      if (that._loadingCallbacks) {
        _.each(that._loadingCallbacks, function(callback) {
          callback();
        });
      }
    }
  });
};

Thorax.mixinLoadableEvents = function(target, useParent) {
  _.extend(target, {
    loadStart: function(message, background) {
      var that = useParent ? this.parent : this;
      that.trigger(loadStart, message, background, that);
    },
    loadEnd: function() {
      var that = useParent ? this.parent : this;
      that.trigger(loadEnd, that);
    }
  });
};

Thorax.mixinLoadable(Thorax.View.prototype);
Thorax.mixinLoadableEvents(Thorax.View.prototype);

Thorax.sync = function(method, dataObj, options) {
  var self = this,
      complete = options.complete;

  options.complete = function() {
    self._request = undefined;
    self._aborted = false;

    complete && complete.apply(this, arguments);
  };
  this._request = Backbone.sync.apply(this, arguments);

  // TODO : Reevaluate this event... Seems too indepth to expose as an API
  this.trigger('request', this._request);
  return this._request;
};

function bindToRoute(callback, failback) {
  var fragment = Backbone.history.getFragment(),
      completed;

  function finalizer(isCanceled) {
    var same = fragment === Backbone.history.getFragment();

    if (completed) {
      // Prevent multiple execution, i.e. we were canceled but the success callback still runs
      return;
    }

    if (isCanceled && same) {
      // Ignore the first route event if we are running in newer versions of backbone
      // where the route operation is a postfix operation.
      return;
    }

    completed = true;
    Backbone.history.off('route', resetLoader);

    var args = Array.prototype.slice.call(arguments, 1);
    if (!isCanceled && same) {
      callback.apply(this, args);
    } else {
      failback && failback.apply(this, args);
    }
  }

  var resetLoader = _.bind(finalizer, this, true);
  Backbone.history.on('route', resetLoader);

  return _.bind(finalizer, this, false);
}

function loadData(callback, failback, options) {
  if (this.isPopulated()) {
    return callback(this);
  }

  if (arguments.length === 2 && typeof failback !== 'function' && _.isObject(failback)) {
    options = failback;
    failback = false;
  }

  this.fetch(_.defaults({
    success: bindToRoute(callback, failback && _.bind(failback, this, false)),
    error: failback && _.bind(failback, this, true)
  }, options));
}

function fetchQueue(options, $super) {
  if (options.resetQueue) {
    // WARN: Should ensure that loaders are protected from out of band data
    //    when using this option
    this.fetchQueue = undefined;
  }

  if (!this.fetchQueue) {
    // Kick off the request
    this.fetchQueue = [options];
    options = _.defaults({
      success: flushQueue(this, this.fetchQueue, 'success'),
      error: flushQueue(this, this.fetchQueue, 'error'),
      complete: flushQueue(this, this.fetchQueue, 'complete')
    }, options);
    $super.call(this, options);
  } else {
    // Currently fetching. Queue and process once complete
    this.fetchQueue.push(options);
  }
}

function flushQueue(self, fetchQueue, handler) {
  return function() {
    var args = arguments;

    // Flush the queue. Executes any callback handlers that
    // may have been passed in the fetch options.
    _.each(fetchQueue, function(options) {
      if (options[handler]) {
        options[handler].apply(this, args);
      }
    }, this);

    // Reset the queue if we are still the active request
    if (self.fetchQueue === fetchQueue) {
      self.fetchQueue = undefined;
    }
  }
}

var klasses = [];
Thorax.Model && klasses.push(Thorax.Model);
Thorax.Collection && klasses.push(Thorax.Collection);

_.each(klasses, function(DataClass) {
  var $fetch = DataClass.prototype.fetch;
  Thorax.mixinLoadableEvents(DataClass.prototype, false);
  _.extend(DataClass.prototype, {
    sync: Thorax.sync,

    fetch: function(options) {
      options = options || {};

      var self = this,
          complete = options.complete;

      options.complete = function() {
        complete && complete.apply(this, arguments);
        self.loadEnd();
      };
      self.loadStart(undefined, options.background);
      return fetchQueue.call(this, options || {}, $fetch);
    },

    load: function(callback, failback, options) {
      if (arguments.length === 2 && typeof failback !== 'function') {
        options = failback;
        failback = false;
      }
      options = options || {};
      if (!options.background && !this.isPopulated() && rootObject) {
        // Make sure that the global scope sees the proper load events here
        // if we are loading in standalone mode
        Thorax.forwardLoadEvents(this, rootObject, true);
      }

      var self = this;
      loadData.call(this, callback,
        function(isError) {
          // Route changed, kill it
          if (!isError) {
            if (self._request) {
              self._aborted = true;
              self._request.abort();
            }
          }

          failback && failback.apply && failback.apply(this, arguments);
        },
        options);
    }
  });
});

Thorax.Util.bindToRoute = bindToRoute;

if (Thorax.Router) {
  Thorax.Router.bindToRoute = Thorax.Router.prototype.bindToRoute = bindToRoute;
}

// Propagates loading view parameters to the AJAX layer


if (Thorax.CollectionView) {
  Thorax.mixinLoadable(Thorax.CollectionView.prototype);
  Thorax.mixinLoadableEvents(Thorax.CollectionView.prototype);
}

// Propagates loading view parameters to the AJAX layer


Thorax.View.on({
  'load:start': Thorax.loadHandler(
      function(message, background, object) {
        this.onLoadStart(message, background, object);
      },
      function(background, object) {
        this.onLoadEnd(object);
      }),

  collection: {
    'load:start': function(message, background, object) {
      this.trigger(loadStart, message, background, object);
    }
  },
  model: {
    'load:start': function(message, background, object) {
      this.trigger(loadStart, message, background, object);
    }
  }
});


// End "src/loading.js"

// Begin "src/helpers/button-link.js"
var callMethodAttributeName = 'data-call-method',
    triggerEventAttributeName = 'data-trigger-event';

Handlebars.registerHelper('button', function(method, options) {
  if (arguments.length === 1) {
    options = method;
    method = options.hash.method;
  }
  if (!method && !options.hash.trigger) {
    throw new Error("button helper must have a method name as the first argument or a 'trigger', or a 'method' attribute specified.");
  }
  options.hash.tag = options.hash.tag || options.hash.tagName || 'button';
  options.hash.trigger && (options.hash[triggerEventAttributeName] = options.hash.trigger);
  delete options.hash.trigger;
  method && (options.hash[callMethodAttributeName] = method);
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, options.fn ? options.fn(this) : '', this));
});

Handlebars.registerHelper('link', function(url, options) {
  if (arguments.length === 1) {
    options = url;
    url = options.hash.href;
  }
  if (!url) {
    throw new Error("link helper requires an href as the first argument or an 'href' attribute");
  }
  options.hash.tag = options.hash.tag || options.hash.tagName || 'a';
  options.hash.href = Handlebars.helpers.url.call(this, url || options.hash.href);
  options.hash.trigger && (options.hash[triggerEventAttributeName] = options.hash.trigger);
  delete options.hash.trigger;
  options.hash[callMethodAttributeName] = '_anchorClick';
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, options.fn ? options.fn(this) : '', this));
});

var clickSelector = '[' + callMethodAttributeName + '], [' + triggerEventAttributeName + ']';

function handleClick(event) {
  var target = $(event.target),
      view = target.view({helper: false}),
      methodName = target.attr(callMethodAttributeName),
      eventName = target.attr(triggerEventAttributeName),
      methodResponse = false;
  methodName && (methodResponse = view[methodName].call(view, event));
  eventName && view.trigger(eventName, event);
  target.tagName === "A" && methodResponse === false && event.preventDefault();
}

var lastClickHandlerEventName;

function registerClickHandler() {
  unregisterClickHandler();
  lastClickHandlerEventName = Thorax._fastClickEventName || 'click';
  $(document).on(lastClickHandlerEventName, clickSelector, handleClick);
}

function unregisterClickHandler() {
  lastClickHandlerEventName && $(document).off(lastClickHandlerEventName, clickSelector, handleClick);
}


  $(registerClickHandler);


// End "src/helpers/button-link.js"

// Begin "src/helpers/collection.js"
Handlebars.registerViewHelper('collection', Thorax.CollectionView, function(collection, view) {
  if (arguments.length === 1) {
    view = collection;
    collection = this._view.collection;
  }
  if (collection) {
    //item-view and empty-view may also be passed, but have no defaults
    _.extend(view.options, {
      'item-template': view.template && view.template !== Handlebars.VM.noop ? view.template : view.options['item-template'],
      'empty-template': view.inverse && view.inverse !== Handlebars.VM.noop ? view.inverse : view.options['empty-template']
    });
    view.setCollection(collection);
  }
});


// End "src/helpers/collection.js"

// Begin "src/helpers/element.js"
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


// End "src/helpers/element.js"

// Begin "src/helpers/empty.js"
Handlebars.registerViewHelper('empty', function(collection, view) {
  var empty, noArgument;
  if (arguments.length === 1) {
    view = collection;
    collection = false;
    noArgument = true;
  }

  var _render = view.render;
  view.render = function() {
    if (noArgument) {
      empty = !this.parent.model || (this.parent.model && !this.parent.model.isEmpty());
    } else if (!collection) {
      empty = true;
    } else {
      empty = collection.isEmpty();
    }
    if (empty) {
      this.parent.trigger('rendered:empty', this, collection);
      return _render.call(this, this.template);
    } else {
      return _render.call(this, this.inverse);
    }
  };

  //no model binding is necessary as model.set() will cause re-render
  if (collection) {
    function collectionRemoveCallback() {
      if (collection.length === 0) {
        view.render();
      }
    }
    function collectionAddCallback() {
      if (collection.length === 1) {
        view.render();
      }
    }
    function collectionResetCallback() {
      view.render();
    }

    view.on(collection, 'remove', collectionRemoveCallback);
    view.on(collection, 'add', collectionAddCallback);
    view.on(collection, 'reset', collectionResetCallback);
  }
  
  view.render();
});


// End "src/helpers/empty.js"

// Begin "src/helpers/loading.js"
Handlebars.registerViewHelper('loading', function(view) {
  _render = view.render;
  view.render = function() {
    if (view.parent.$el.hasClass(view.parent._loadingClassName)) {
      return _render.call(this, view.fn);
    } else {
      return _render.call(this, view.inverse);
    }
  };
  var callback = _.bind(view.render, view);
  view.parent._loadingCallbacks = view.parent._loadingCallbacks || [];
  view.parent._loadingCallbacks.push(callback);
  view.on('freeze', function() {
    view.parent._loadingCallbacks = _.without(view.parent._loadingCallbacks, callback);
  });
  view.render();
});


// End "src/helpers/loading.js"

// Begin "src/helpers/super.js"
Handlebars.registerHelper('super', function() {
  var parent = this._view.constructor && this._view.constructor.__super__;
  if (parent) {
    var template = parent.template;
    if (!template) { 
      if (!parent.name) {
        throw new Error('Cannot use super helper when parent has no name or template.');
      }
      template = Thorax.Util.getTemplate(parent.name, false);
    }
    if (typeof template === 'string') {
      template = Handlebars.compile(template);
    }
    return new Handlebars.SafeString(template(this));
  } else {
    return '';
  }
});


// End "src/helpers/super.js"

// Begin "src/helpers/template.js"
Handlebars.registerHelper('template', function(name, options) {
  var context = _.extend({fn: options && options.fn}, this, options ? options.hash : {});
  var output = Thorax.View.prototype.renderTemplate.call(this._view, name, context);
  return new Handlebars.SafeString(output);
});


// End "src/helpers/template.js"

// Begin "src/helpers/url.js"
Handlebars.registerHelper('url', function(url) {
  var fragment;
  if (arguments.length > 2) {
    fragment = _.map(_.head(arguments, arguments.length - 1), encodeURIComponent).join('/');
  } else {
    var options = arguments[1],
        hash = (options && options.hash) || options;
    if (hash && hash['expand-tokens']) {
      fragment = Thorax.Util.expandToken(url, this);
    } else {
      fragment = url;
    }
  }
  return (Backbone.history._hasPushState ? Backbone.history.options.root : '#') + fragment;
});


// End "src/helpers/url.js"

// Begin "src/helpers/view.js"
var viewTemplateOverrides = {};
Handlebars.registerHelper('view', function(view, options) {
  if (arguments.length === 1) {
    options = view;
    view = Thorax.View;
  }
  var instance = Thorax.Util.getViewInstance(view, options ? options.hash : {});
  if (!instance) {
    return '';
  }
  var placeholder_id = instance.cid + '-' + _.uniqueId('placeholder');
  this._view._addChild(instance);
  this._view.trigger('child', instance);
  if (options.fn) {
    viewTemplateOverrides[placeholder_id] = options.fn;
  }
  var htmlAttributes = Thorax.Util.htmlAttributesFromOptions(options.hash);
  htmlAttributes[viewPlaceholderAttributeName] = placeholder_id;
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, htmlAttributes));
});

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
      //see if the view helper declared an override for the view
      //if not, ensure the view has been rendered at least once
      if (viewTemplateOverrides[placeholder_id]) {
        view.render(viewTemplateOverrides[placeholder_id](view._getContext()));
      } else {
        view.ensureRendered();
      }
      $(el).replaceWith(view.el);
      //TODO: jQuery has trouble with delegateEvents() when
      //the child dom node is detached then re-attached
      if (typeof jQuery !== 'undefined' && $ === jQuery) {
        if (this._renderCount > 1) {
          view.delegateEvents();
        }
      }
      callback && callback(view.el);
    }
  }, this);
};


// End "src/helpers/view.js"



})();
