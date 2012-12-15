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
    viewHelperAttributeName = 'data-view-helper';

//view instances
var viewsIndexedByCid = {};

var Thorax = this.Thorax = {
  VERSION: '{{version}}',
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

{{#has-plugin "event"}}
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
{{/has-plugin}}


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
