/*global cloneInheritVars, createInheritVars, createRegistryWrapper, getValue, inheritVars */

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
  VERSION: '2.0.0rc4',
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

    this._objectOptionsByCid = {};
    this._boundDataObjectsByCid = {};

    // Setup object event tracking
    _.each(inheritVars, function(obj) {
      self[obj.name] = [];
    });

    viewsIndexedByCid[this.cid] = this;
    this.children = {};
    this._renderCount = 0;

    //this.options is removed in Thorax.View, we merge passed
    //properties directly with the view and template context
    _.extend(this, options || {});

    // Setup helpers
    bindHelpers.call(this);

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
    this.trigger('child', view);
    return view;
  },

  _removeChild: function(view) {
    delete this.children[view.cid];
    view.parent = null;
    return view;
  },

  destroy: function(options) {
    options = _.defaults(options || {}, {
      children: true
    });
    _.each(this._boundDataObjectsByCid, this.unbindDataObject, this);
    this.trigger('destroyed');
    delete viewsIndexedByCid[this.cid];
    _.each(this.children, function(child) {
      this._removeChild(child);
      if (options.children) {
        child.destroy();
      }
    }, this);
    if (this.parent) {
      this.parent._removeChild(this);
    }
    this.remove(); // Will call stopListening()
  },

  render: function(output) {
    this._previousHelpers = _.filter(this.children, function(child) { return child._helperOptions; });

    var children = {};
    _.each(this.children, function(child, key) {
      if (!child._helperOptions) {
        children[key] = child;
      }
    });
    this.children = children;

    if (_.isUndefined(output) || (!_.isElement(output) && !Thorax.Util.is$(output) && !(output && output.el) && !_.isString(output) && !_.isFunction(output))) {
      // try one more time to assign the template, if we don't
      // yet have one we must raise
      assignTemplate.call(this, 'template', {
        required: true
      });
      output = this.renderTemplate(this.template);
    } else if (_.isFunction(output)) {
      output = this.renderTemplate(output);
    }

    // Destroy any helpers that may be lingering
    _.each(this._previousHelpers, function(child) {
      child.destroy();
      child.parent = undefined;
    });
    this._previousHelpers = undefined;

    //accept a view, string, Handlebars.SafeString or DOM element
    this.html((output && output.el) || (output && output.string) || output);
    ++this._renderCount;
    this.trigger('rendered');
    return output;
  },

  context: function() {
    return _.extend({}, (this.model && this.model.attributes) || {});
  },

  _getContext: function() {
    return _.extend({}, this, getValue(this, 'context') || {});
  },

  // Private variables in handlebars / options.data in template helpers
  _getData: function(data) {
    return {
      view: this,
      cid: _.uniqueId('t'),
      yield: function() {
        // fn is seeded by template helper passing context to data
        return data.fn && data.fn(data);
      }
    };
  },

  _getHelpers: function() {
    if (this.helpers) {
      return _.extend({}, Handlebars.helpers, this.helpers);
    } else {
      return Handlebars.helpers;
    }

  },

  renderTemplate: function(file, context, ignoreErrors) {
    var template;
    context = context || this._getContext();
    if (_.isFunction(file)) {
      template = file;
    } else {
      template = Thorax.Util.getTemplate(file, ignoreErrors);
    }
    if (!template) {
      return '';
    } else {
      return template(context, {
        helpers: this._getHelpers(),
        data: this._getData(context)
      });
    }
  },

  ensureRendered: function() {
    !this._renderCount && this.render();
  },

  appendTo: function(el) {
    this.ensureRendered();
    $(el).append(this.el);
    this.trigger('ready', {target: this});
  },

  html: function(html) {
    if (_.isUndefined(html)) {
      return this.el.innerHTML;
    } else {
      // Event for IE element fixes
      this.trigger('before:append');
      var element = this._replaceHTML(html);
      notifyElementsHash.call(this);
      this.trigger('append');
      return element;
    }
  },

  _replaceHTML: function(html) {
    this.el.innerHTML = "";
    return this.$el.append(html);
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

Thorax.View.extend = function() {
  createInheritVars(this);

  var child = Backbone.View.extend.apply(this, arguments);
  child.__parent__ = this;

  resetInheritVars(child);

  return child;
};

createRegistryWrapper(Thorax.View, Thorax.Views);

function bindHelpers() {
  if (this.helpers) {
    _.each(this.helpers, function(helper, name) {
      var view = this;
      this.helpers[name] = function() {
        var args = _.toArray(arguments),
            options = _.last(args);
        options.context = this;
        return helper.apply(view, args);
      };
    }, this);
  }
}

function notifyElementsHash() {
  if (this.elements) {
    _.each(this.elements, function(callback, selector) {
      callback = _.isFunction(callback) ? callback : this[callback];
      callback.call(this, this.$(selector));
    }, this);
  }
}

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
