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
  };
}

var viewNameAttributeName = 'data-view-name',
    viewCidAttributeName = 'data-view-cid',
    viewPlaceholderAttributeName = 'data-view-tmp',
    viewHelperAttributeName = 'data-view-helper';

//view instances
var viewsIndexedByCid = {};

var Thorax = this.Thorax = {
  VERSION: '2.0.0b6',
  templatePathPrefix: '',
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

Thorax.View = Backbone.View.extend({
  constructor: function() {
    var response = Backbone.View.apply(this, arguments);
    _.each(inheritVars, function(obj) {
      if (obj.ctor) {
        obj.ctor.call(this, response);
      }
    }, this);
    return response;
  },
  _configure: function(options) {
    var self = this;

    // Setup object event tracking
    _.each(inheritVars, function(obj) {
      self[obj.name] = [];
      if (obj.array) { self[obj.array] = []; }
      if (obj.hash) { self[obj.hash] = {}; }
    });

    viewsIndexedByCid[this.cid] = this;
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

    _.each(inheritVars, function(obj) {
      if (obj.configure) {
        obj.configure.call(this);
      }
    }, this);
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
    delete viewsIndexedByCid[this.cid];
    if (options.children) {
      _.each(this.children, function(child) {
        child.parent = null;
        child.destroy();
      });
      this.children = {};
    }

    this.freeze && this.freeze();
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
    if (this.model && this.model.attributes) {
      return _.extend({}, this, (this.model && this.model.attributes) || {});
    } else {
      return this;
    }
  },

  _getContext: function(attributes) {
    var data = _.extend({}, getValue(this, 'context'), attributes || {}, {
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
        return '';
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
      this.el.innerHTML = "";
      var element = this.$el.append(html);
      
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


  _.extend(Thorax.View, {
    on: function(eventName, callback) {
      createInheritVars(this);

      if (objectEvents(this, eventName, callback)) {
        return this;
      }

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
  createInheritVars(this);

  var child = Backbone.View.extend.apply(this, arguments);

  cloneInheritVars(this, child);

  return child;
};

createRegistryWrapper(Thorax.View, Thorax.Views);

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
  return (el && viewsIndexedByCid[el.attr(viewCidAttributeName)]) || false;
};


// End "src/thorax.js"

// Begin "src/util.js"
/*global createRegistryWrapper:true, cloneEvents: true */
function createRegistryWrapper(klass, hash) {
  var $super = klass.extend;
  klass.extend = function() {
    var child = $super.apply(this, arguments);
    if (child.prototype.name) {
      hash[child.prototype.name] = child;
    }
    return child;
  };
}
function registryGet(object, type, name, ignoreErrors) {
  var target = object[type],
      value;
  if (name.indexOf('.') >= 0) {
    var bits = name.split(/\./);
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
}

function getValue(object, prop) {
  if (!(object && object[prop])) {
    return null;
  }
  return _.isFunction(object[prop])
    ? object[prop].apply(object, Array.prototype.slice.call(arguments, 2))
    : object[prop];
}

var inheritVars = {};
function createInheritVars(self) {
  // Ensure that we have our static event objects
  _.each(inheritVars, function(obj) {
    if (!self[obj.name]) {
      self[obj.name] = [];
    }
  });
}
function cloneInheritVars(source, target) {
  _.each(inheritVars, function(obj) {
    var key = obj.name;
    source[key] = _.clone(target[key]);

    //need to deep clone events array
    _.each(source[key], function(value, _key) {
      if (_.isArray(value)) {
        target[key][_key] = _.clone(value);
      }
    });
  });
}
function objectEvents(target, eventName, callback) {
  if (_.isObject(callback)) {
    var spec = inheritVars[eventName];
    if (spec && spec.event) {
      addEvents(target[spec.name], callback);
      return true;
    }
  }
}
function addEvents(target, source) {
  _.each(source, function(callback, eventName) {
    if (_.isArray(callback)) {
      _.each(callback, function(cb) {
        target.push([eventName, cb]);
      });
    } else {
      target.push([eventName, callback]);
    }
  });
}

function extendViewMember(name, callback) {
  var $super = Thorax.View.prototype[name];
  Thorax.View.prototype[name] = function() {
    var ret = $super.apply(this, arguments);
    callback.apply(this, arguments);
    return ret;
  };
}
function extendOptions(name, callback) {
  var $super = Thorax.View.prototype[name];
  Thorax.View.prototype[name] = function(dataObject, options) {
    return $super.call(this, dataObject, _.extend(callback.call(this, dataObject, options), options));
  };
}

Thorax.Util = {
  getViewInstance: function(name, attributes) {
    attributes['class'] && (attributes.className = attributes['class']);
    attributes.tag && (attributes.tagName = attributes.tag);
    if (typeof name === 'string') {
      var Klass = registryGet(Thorax, 'Views', name, false);
      return Klass.cid ? _.extend(Klass, attributes || {}) : new Klass(attributes);
    } else if (typeof name === 'function') {
      return new name(attributes);
    } else {
      return name;
    }
  },

  getTemplate: function(file, ignoreErrors) {
    //append the template path prefix if it is missing
    var pathPrefix = Thorax.templatePathPrefix,
        template;
    if (pathPrefix && file.substr(0, pathPrefix.length) !== pathPrefix) {
      file = pathPrefix + file;
    }

    // Without extension
    file = file.replace(/\.handlebars$/, '');
    template = Thorax.templates[file];
    if (!template) {
      // With extension
      file = file + '.handlebars';
      template = Thorax.templates[file];
    }

    if (template && typeof template === 'string') {
      template = Thorax.templates[file] = Handlebars.compile(template);
    } else if (!template && !ignoreErrors) {
      throw new Error('templates: ' + file + ' does not exist.');
    }
    return template;
  },

  //'selector' is not present in $('<p></p>')
  //TODO: investigage a better detection method
  is$: function(obj) {
    return typeof obj === 'object' && ('length' in obj);
  },
  expandToken: function(input, scope) {
    // concatenate handlebars tokens as this file itself is a handlebars template
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
    var htmlAttributes = _.omit(attributes, 'tag', 'tagName'),
        tag = attributes.tag || attributes.tagName || 'div';
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
  }
};


// End "src/util.js"

// Begin "src/mixin.js"
/*global createInheritVars, inheritVars */
Thorax.Mixins = {};

inheritVars.mixins = {
  name: 'mixins',
  configure: function(mixin) {
    _.each(this.constructor.mixins, this.mixin, this);
    _.each(this.mixins, this.mixin, this);
  }
};

_.extend(Thorax.View, {
  mixin: function(mixin) {
    createInheritVars(this);
    this.mixins.push(mixin);
  },
  registerMixin: function(name, callback, methods) {
    Thorax.Mixins[name] = [callback, methods];
  }
});

Thorax.View.prototype.mixin = function(name) {
  if (!this._appliedMixins) {
    this._appliedMixins = [];
  }
  if (this._appliedMixins.indexOf(name) === -1) {
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


// End "src/mixin.js"

// Begin "src/event.js"
// Save a copy of the _on method to call as a $super method
var _on = Thorax.View.prototype.on;

inheritVars.event = {
  name: '_events',

  configure: function(handle, eventName) {
    _.each(this.constructor._events, function(event) {
      this.on.apply(this, event);
    }, this);
    _.each(getValue(this, 'events'), function(handler, eventName) {
      this.on(eventName, handler, this);
    }, this);
  }
};

_.extend(Thorax.View.prototype, {
  freeze: function(options) {
    _.each(inheritVars, function(obj) {
      if (obj.unbind) {
        _.each(this[obj.array], this[obj.unbind], this);
      }
    }, this);

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
    if (objectEvents(this, eventName, callback)) {
      return this;
    }

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
  
    ,
    'singleTap', 'doubleTap', 'longTap',
    'swipe',
    'swipeUp', 'swipeDown',
    'swipeLeft', 'swipeRight'
  
];
var domEventRegexp = new RegExp('^(' + domEvents.join('|') + ')');

function containHandlerToCurentView(handler, cid) {
  return function(event) {
    var view = $(event.target).view({helper: false});
    if (view && view.cid == cid) {
      event.originalContext = this;
      handler(event);
    }
  };
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

// Begin "src/data-object.js"
/*global inheritVars */
function dataObject(type, spec) {
  spec = inheritVars[type] = _.defaults({event: true}, spec);

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

    bindEvents.call(this, dataObject, this.constructor[spec.name]);
    bindEvents.call(this, dataObject, this[spec.name]);

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
    unbindEvents.call(this, dataObject, this.constructor[spec.name]);
    unbindEvents.call(this, dataObject, this[spec.name]);
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


// End "src/data-object.js"

// Begin "src/model.js"
/*global createRegistryWrapper, dataObject, getValue */
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
    return keys.length > 1 || (keys.length === 1 && keys[0] !== 'id');
  }
});

Thorax.Models = {};
createRegistryWrapper(Thorax.Model, Thorax.Models);

dataObject('model', {
  name: '_modelEvents',
  array: '_models',
  hash: '_modelOptionsByCid',

  ctor: function() {
    if (this.model) {
      //need to null this.model so setModel will not treat
      //it as the old model and immediately return
      var model = this.model;
      this.model = null;
      this.setModel(model);
    }
  },

  set: 'setModel',
  bind: 'bindModel',
  unbind: 'unbindModel',
  options: '_setModelOptions',
  change: '_onModelChange',
  cidAttrName: modelCidAttributeName
});

_.extend(Thorax.View.prototype, {
  _onModelChange: function(model) {
    var modelOptions = model && this._modelOptionsByCid[model.cid];
    // !modelOptions will be true when setModel(false) is called
    if (!modelOptions || (modelOptions && modelOptions.render)) {
      this.render();
    }
  }
});

Thorax.View.on({
  model: {
    error: function(model, errors) {
      if (this._modelOptionsByCid[model.cid].errors) {
        this.trigger('error', errors, model);
      }
    },
    change: function(model) {
      this._onModelChange(model);
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


// End "src/model.js"

// Begin "src/collection.js"
/*global createRegistryWrapper, dataObject, getValue, modelCidAttributeName, viewCidAttributeName */
var _fetch = Backbone.Collection.prototype.fetch,
    _reset = Backbone.Collection.prototype.reset,
    collectionCidAttributeName = 'data-collection-cid',
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
    return this._fetched || this.length > 0 || (!this.length && !getValue(this, 'url'));
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
createRegistryWrapper(Thorax.Collection, Thorax.Collections);

dataObject('collection', {
  name: '_collectionEvents',
  array: '_collections',
  hash: '_collectionOptionsByCid',
  set: 'setCollection',
  bind: 'bindCollection',
  unbind: 'unbindCollection',
  cidAttrName: collectionCidAttributeName
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
        itemView = '<div>' + itemView + '</div>';
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

function itemShouldBeVisible(model) {
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
    remove: function(model /*, collection */) {
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
/*global extendOptions, extendViewMember */

extendOptions('_setModelOptions', function() {
  return {
    populate: true
  };
});

extendViewMember('_onModelChange', function(model) {
  // TODO : What can we do to remove this duplication?
  var modelOptions = model && this._modelOptionsByCid[model.cid];
  if (modelOptions && modelOptions.populate) {
    this.populate(model.attributes, modelOptions.populate === true ? {} : modelOptions.populate);
  }
});

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


// End "src/form.js"

// Begin "src/view-controller.js"
/*global createRegistryWrapper, registryGet */
//Router
function initializeRouter() {
  Backbone.history || (Backbone.history = new Backbone.History());
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
createRegistryWrapper(Thorax.Router, Thorax.Routers);

function onRoute(router /* , name */) {
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
      view = new (Thorax.Util.registryGet(Thorax, 'Views', view, false))();
    }
    this.ensureRendered();
    var oldView = this._view;
    if (view === oldView) {
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
    
      options.scroll && Thorax.Util.scrollTo(0, 0);
    
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
    this.on('route:before', function(/* router, name */) {
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
/*global collectionOptionNames, extendOptions, inheritVars */
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
          } catch (e) {
            Thorax.onException('loadStart', e);
          }
        },
        loadingTimeout * 1000);
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
          } catch (e) {
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
    onLoadEnd: function(/* background, object */) {
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

var globalRouteCount = (function() {
  var routeCount = 0;
  Backbone.history || (Backbone.history = new Backbone.History());
  Backbone.history.on('route', function() {
    routeCount++;
  });
  return function() { return routeCount; };
})();

function bindToRoute(callback, failback) {
  var routeCount = globalRouteCount();

  function finalizer() {
    var args = Array.prototype.slice.call(arguments, 1);
    if (routeCount === globalRouteCount()) {
      callback.apply(this, args);
    } else {
      failback && failback.apply(this, args);
    }
  }

  return _.bind(finalizer, this);
}

function loadData(callback, failback, options) {
  if (this.isPopulated()) {
    return callback(this);
  }

  if (arguments.length === 2 && typeof failback !== 'function' && _.isObject(failback)) {
    options = failback;
    failback = false;
  }

  var self = this,
      routeChanged = false,
      fragment = Backbone.history.getFragment();

  function routeHandler() {
    if (fragment === Backbone.history.getFragment()) {
      return;
    }
    routeChanged = true;
    Backbone.history.off('route', routeHandler);
    if (self._request) {
      self._aborted = true;
      self._request.abort();
    }
    failback && failback.call(self, false);
  }

  Backbone.history.on('route', routeHandler);

  this.fetch(_.defaults({
    success: function() {
      !routeChanged && callback.apply(self, arguments);
    },
    error: failback && function() {
      !routeChanged && failback.apply(self, [true].concat(_.toArray(arguments)));
    },
    complete: function() {
      Backbone.history.off('route', routeHandler);
    }
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
  };
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

      loadData.call(this, callback, failback, options);
    }
  });
});

Thorax.Util.bindToRoute = bindToRoute;

if (Thorax.Router) {
  Thorax.Router.bindToRoute = Thorax.Router.prototype.bindToRoute = bindToRoute;
}

// Propagates loading view parameters to the AJAX layer
function loadingDataOptions() {
  return {
    ignoreErrors: this.ignoreFetchError,
    background: this.nonBlockingLoad
  };
}
extendOptions('_setModelOptions', loadingDataOptions);
extendOptions('_setCollectionOptions', loadingDataOptions);

if (Thorax.CollectionView) {
  Thorax.mixinLoadable(Thorax.CollectionView.prototype);
  Thorax.mixinLoadableEvents(Thorax.CollectionView.prototype);

  inheritVars.collection.loading = function() {
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
  };

  collectionOptionNames.push('loading-template', 'loading-view', 'loading-placement');
}

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
  var hash = options.hash,
      expandTokens = hash['expand-tokens'];
  delete hash['expand-tokens'];
  if (!method && !options.hash.trigger) {
    throw new Error("button helper must have a method name as the first argument or a 'trigger', or a 'method' attribute specified.");
  }
  hash.tag = hash.tag || hash.tagName || 'button';
  hash.trigger && (hash[triggerEventAttributeName] = hash.trigger);
  delete hash.trigger;
  method && (hash[callMethodAttributeName] = method);
  return new Handlebars.SafeString(Thorax.Util.tag(hash, options.fn ? options.fn(this) : '', expandTokens ? this : null));
});

Handlebars.registerHelper('link', function() {
  var args = _.toArray(arguments),
      options = args.pop(),
      hash = options.hash,
      // url is an array that will be passed to the url helper
      url = args.length === 0 ? [hash.href] : args,
      expandTokens = hash['expand-tokens'];
  delete hash['expand-tokens'];
  if (!url[0]) {
    throw new Error("link helper requires an href as the first argument or an 'href' attribute");
  }
  url.push(options);
  hash.href = Handlebars.helpers.url.apply(this, url);
  hash.tag = hash.tag || hash.tagName || 'a';
  hash.trigger && (hash[triggerEventAttributeName] = options.hash.trigger);
  delete hash.trigger;
  hash[callMethodAttributeName] = '_anchorClick';
  return new Handlebars.SafeString(Thorax.Util.tag(hash, options.fn ? options.fn(this) : '', expandTokens ? this : null));
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
var elementPlaceholderAttributeName = 'data-element-tmp';

Handlebars.registerHelper('element', function(element, options) {
  var cid = _.uniqueId('element'),
      htmlAttributes = Thorax.Util.htmlAttributesFromOptions(options.hash);
  htmlAttributes[elementPlaceholderAttributeName] = cid;
  this._view._elementsByCid || (this._view._elementsByCid = {});
  this._view._elementsByCid[cid] = element;
  return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes));
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
  var _render = view.render;
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
/*global viewPlaceholderAttributeName */
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
  var placeholder_id = instance.cid + '-' + _.uniqueId('placeholder'),
      expandTokens = options.hash['expand-tokens'];
  delete options.hash['expand-tokens'];
  this._view._addChild(instance);
  this._view.trigger('child', instance);
  if (options.fn) {
    viewTemplateOverrides[placeholder_id] = options.fn;
  }
  var htmlAttributes = Thorax.Util.htmlAttributesFromOptions(options.hash);
  htmlAttributes[viewPlaceholderAttributeName] = placeholder_id;
  return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes, undefined, expandTokens ? this : null));
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
      callback && callback(view.el);
    }
  }, this);
};


// End "src/helpers/view.js"

// Begin "src/mobile.js"
var isMobile = 'ontouchstart' in document.documentElement,
    isiOS = navigator.userAgent.match(/(iPhone|iPod|iPad)/i),
    isAndroid = navigator.userAgent.toLowerCase().indexOf("android") > -1 ? 1 : 0,
    minimumScrollYOffset = isAndroid ? 1 : 0;

Thorax.Util.scrollTo = function(x, y) {
  y = y || minimumScrollYOffset;
  function _scrollTo() {
    window.scrollTo(x, y);
  }
  if (isiOS) {
    // a defer is required for ios
    _.defer(_scrollTo);
  } else {
    _scrollTo();
  }
  return [x, y];
};

Thorax.Util.scrollToTop = function() {
  // android will use height of 1 because of minimumScrollYOffset in scrollTo()
  return this.scrollTo(0, 0);
};

//built in dom events
Thorax.View.on({
  'submit form': function(/* event */) {
    // Hide any virtual keyboards that may be lingering around
    var focused = $(':focus')[0];
    focused && focused.blur();
  }
});
//removal of click delay on mobile webkit
var TAP_RANGE = 5;    // +-5px is still considered a tap

Thorax._fastClickEventName = 'click';
Thorax.configureFastClick = function(useFastClick) {
  var body = document.body;
  if (useFastClick && isMobile) {
    Thorax._fastClickEventName = 'fast-click';
    body.addEventListener('touchstart', onTouchStart, true);
    body.addEventListener('touchmove', onTouchMove, true);
    body.addEventListener('touchend', onTouchEnd, true);
    body.addEventListener('click', clickKiller, true);
  } else {
    Thorax._fastClickEventName = 'click';
    body.removeEventListener('touchstart', onTouchStart, true);
    body.removeEventListener('touchmove', onTouchMove, true);
    body.removeEventListener('touchend', onTouchEnd, true);
    body.removeEventListener('click', clickKiller, true);
  }
  
    registerClickHandler && registerClickHandler();
  
};

if (isMobile) {
  var start,
      clickRedRum;

  function onTouchStart(event) {
    try {
      if (event.touches.length === 1) {
        var touch = event.touches[0];
        start = {x: touch.clientX, y: touch.clientY};
      } else {
        start = false;
      }
      clickRedRum = false;
    } catch(e) {
      Thorax.onException('fast-click start', e);
    }
  }

  function onTouchMove() {
    if (!event.touches || event.touches.length > 1) {
      start = false;
    }
  }

  function defaultPrevented(event) {
    return event.isDefaultPrevented ? event.isDefaultPrevented() : event.defaultPrevented;
  }

  function onTouchEnd(event) {
    try {
      var touch = event.changedTouches[0];
      if (start
          && Math.abs(touch.clientX-start.x) <= TAP_RANGE
          && Math.abs(touch.clientY-start.y) <= TAP_RANGE) {
        var target = touch.target;

        // see if target element or ancestor is disabled as click would not be triggered in this case
        var disabled = !!($(target).closest('[disabled]').length);
        if (!disabled) {
          event = $.Event(Thorax._fastClickEventName, {original: event});
          $(target).trigger(event);
          if (!defaultPrevented(event) && (target.control || target.htmlFor)) {
            if (target.control) {
              $(target.control).trigger(event);
            } else {
              $("#" + target.htmlFor).trigger(event);
            }
          }
          if (defaultPrevented(event)) {
            // If the fast-click was handled, prevent futher operations
            clickRedRum = true;
            event.original.preventDefault();
            event.defaultPrevented = true;
          }
        }
      }
    } catch(e) {
      Thorax.onException('fast-click end', e);
    }
  }

  function clickKiller(event) {
    if (clickRedRum) {
      event.preventDefault();
      event.stopPropagation();
      clickRedRum = false;
    }
  }

  // Use this instead of $(function() {}) so that jQuery
  // does not register a timeout
  $(document).ready(function() {
    Thorax.configureFastClick(isMobile);
  });
} else {
  
    registerClickHandler && registerClickHandler();
  
}
$.fn.tapHoldAndEnd = function(selector, callbackStart, callbackEnd) {
  function triggerEvent(obj, eventType, callback, event) {
    var originalType = event.type,
        result;

    event.type = eventType;
    if (callback) {
      result = callback.call(obj, event);
    }
    event.type = originalType;
    return result;
  }

  var timers = [];
  return this.each(function() {
    var thisObject = this,
        tapHoldStart = false,
        $this = $(thisObject);

    $this.on('touchstart', selector, function(event) {
      tapHoldStart = false;
      var origEvent = event,
          timer;

      function clearTapTimer(event) {
        clearTimeout(timer);

        if (tapHoldStart) {
          var retval = false;
          if (event) {
            // We aren't sending any end events for touchcancel cases,
            // prevent an exception
            retval = triggerEvent(thisObject, 'tapHoldEnd', callbackEnd, event);
          }
          if (retval === false) {
            _.each(timers, clearTimeout);
            timers = [];
          }
        }
      }

      $(document).one('touchcancel', function() {
        clearTapTimer();

        $this.off('touchmove', selector, clearTapTimer);
        $this.off('touchend', selector, clearTapTimer);
      });

      $this.on('touchend', selector, clearTapTimer);
      $this.on('touchmove', selector, clearTapTimer);

      timer = setTimeout(function() {
        tapHoldStart = true;
        var retval = triggerEvent(thisObject, 'tapHoldStart', callbackStart, origEvent);
        if (retval === false) {
          _.each(timers, clearTimeout);
          timers = [];
        }
      }, 150);
      timers.push(timer);
    });
  });
};

//only enable on android
var useNativeHighlight = !isAndroid;
Thorax.configureTapHighlight = function(useNative) {
  useNativeHighlight = useNative;
};

var NATIVE_TAPPABLE = {
  'A': true,
  'INPUT': true,
  'BUTTON': true,
  'SELECT': true,
  'TEXTAREA': true
};

function fixupTapHighlight(scope) {
  _.each(this._domEvents || [], function(bind) {
    var components = bind.split(' '),
        selector = components.slice(1).join(' ') || undefined;  // Needed to make zepto happy

    if (components[0] === 'click') {
      // !selector case is for root click handlers on the view, i.e. 'click'
      $(selector || this.el, selector && (scope || this.el)).forEach(function(el) {
        var $el = $(el).data('tappable', true);

        if (useNativeHighlight && !NATIVE_TAPPABLE[el.tagName]) {
          // Add an explicit NOP bind to allow tap-highlight support
          $el.on('click', false);
        }
      });
    }
  }, this);
}

_.extend(Thorax.View.prototype, {
  _tapHighlightClassName: 'active',
  _tapHighlightStart: function(event) {
    var target = event.currentTarget,
        tagName = target && target.tagName.toLowerCase();

    // User input controls may be visually part of a larger group. For these cases
    // we want to give priority to any parent that may provide a focus operation.
    if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
      target = $(target).closest('[data-tappable=true]')[0] || target;
    }

    if (target) {
      $(target).addClass(this._tapHighlightClassName);
      return false;
    }
  },
  _tapHighlightEnd: function(event) {
    $('.' + this._tapHighlightClassName).removeClass(this._tapHighlightClassName);
  }
});

//TODO: examine if these are still needed
var fixupTapHighlightCallback = function() {
  fixupTapHighlight.call(this);
};

Thorax.View.on({
  'rendered': fixupTapHighlightCallback,
  'rendered:collection': fixupTapHighlightCallback,
  'rendered:item': fixupTapHighlightCallback,
  'rendered:empty': fixupTapHighlightCallback
});

var _setElement = Thorax.View.prototype.setElement,
    tapHighlightSelector = '[data-tappable=true], a, input, button, select, textarea';

Thorax.View.prototype.setElement = function() {
  var response = _setElement.apply(this, arguments);
  if (!this.noTapHighlight) {
    if (!useNativeHighlight) {
      var self = this;
      function exec(name) {
        return function() {
          try {
            self[name].apply(self, arguments);
          } catch(e) {
            Thorax.onException(name, e);
          }
        };
      }
      this.$el.tapHoldAndEnd(tapHighlightSelector, exec('_tapHighlightStart'), exec('_tapHighlightEnd'));
    }
  }
  return response;
};

var _addEvent = Thorax.View.prototype._addEvent;
Thorax.View.prototype._addEvent = function(params) {
  this._domEvents = this._domEvents || [];
  (params.type === "DOM") && this._domEvents.push(params.originalName);
  isMobile && (params.name = params.name.replace(/^click\b/, Thorax._fastClickEventName));
  return _addEvent.call(this, params);
};


// End "src/mobile.js"



})();
