/*global
    Thorax:true,
    $serverSide,
    assignTemplate, createError, createInheritVars, createRegistryWrapper, getValue,
    inheritVars, resetInheritVars,
    Deferrable, ServerMarshal
*/

// Provide default behavior for client-failover
if (typeof $serverSide === 'undefined') {
  window.$serverSide = false;
}

var isIE11 = !!navigator.userAgent.match(/Trident\/7\./);
var isIE = isIE11 || (/msie [\w.]+/).exec(navigator.userAgent.toLowerCase());

//support zepto.forEach on jQuery
if (!$.fn.forEach) {
  $.fn.forEach = function(iterator, context) {
    $.fn.each.call(this, function(index) {
      iterator.call(context || this, this, index);
    });
  };
}

var setImmediate = window.setImmediate || function(callback) {
  setTimeout(callback, 0);
};

var viewNameAttributeName = 'data-view-name',
    viewCidAttributeName = 'data-view-cid',
    viewHelperAttributeName = 'data-view-helper',

    // Used to identify views that can be restored vs. rerendered on the client side.
    // Values are:
    //  - true - Can be restored
    //  - false - Must be rerendered
    //  - Omitted - Normal HTML element without associated view
    viewRestoreAttribute = 'data-view-restore';

//view instances
var viewsIndexedByCid = {};

if (!Handlebars.templates) {
  Handlebars.templates = {};
}

var Thorax = this.Thorax = {
  templatePathPrefix: '',
  //view classes
  Views: {},

  // Allows tagging of sections of code with a name for debugging purposes.
  // This or onException should be overriden to allow for reporting exceptions to analytics servers
  // or integration with libraries such as Costanza.
  bindSection: function(name, info, callback) {
    if (!callback) {
      callback = info;
      info = undefined;
    }
    return function() {
      try {
        return callback.apply(this, arguments);
      } catch (err) {
        Thorax.onException(name, err, info);
      }
    };
  },
  runSection: function(name, info, callback) {
    return Thorax.bindSection(name, info, callback)();
  },

  onException: function(name, err /* , info */) {
    throw err;
  },

  //deprecated, here to ensure existing projects aren't mucked with
  templates: Handlebars.templates
};

Thorax.View = Backbone.View.extend({
  constructor: function ThoraxView(options) {
    // store first argument for configureView()
    this._constructorArg = options;
    var response = Backbone.View.call(this, options);
    this._constructorArg = undefined;

    _.each(inheritVars, function(obj) {
      if (obj.ctor) {
        obj.ctor(this, response);
      }
    }, this);
    return response;
  },

  toString: function() {
    return '[object View.' + this.name + ']';
  },

  // View configuration, _configure was removed
  // in Backbone 1.1, define _configure as a noop
  // for Backwards compatibility with 1.0 and earlier
  _configure: function() {},
  _ensureElement: function () {
    configureView(this);

    if (!$serverSide && this.el) {
      var $el = $(_.result(this, 'el'));
      if ($el.length && ($el.attr('data-view-restore') === 'true')) {
        return this.restore($el);
      }
    }

    return Backbone.View.prototype._ensureElement.call(this);
  },


  setElement : function(element, delegate) {
    var $element = $(element),
        existingCid = $element.attr('data-view-cid');
    if (existingCid) {
      this._assignCid(existingCid);
    }
    var response = Backbone.View.prototype.setElement.call(this, $element, delegate);

    // Use a hash here to avoid multiple DOM operations
    var attr = {'data-view-cid': this.cid};
    if (this.name) {
      attr[viewNameAttributeName] = this.name;
    }
    this.$el.attr(attr);

    if (element.parentNode) {
      // This is a view that is attaching to an existing node and is unlikely to be added as
      // a children of any views. Assume that anyone doing this will manage the lifecycle
      // appropriately and destroy so we don't leak due to the `$.view` lookup that we are
      // registering here.
      this.retain();
    }

    return response;
  },
  _assignCid: function(cid) {
    if (this.cid && viewsIndexedByCid[this.cid]) {
      delete viewsIndexedByCid[this.cid];
      viewsIndexedByCid[cid] = this;
    }

    if (this.parent) {
      delete this.parent.children[this.cid];
      this.parent.children[cid] = this;
    }

    this.cid = cid;
  },

  _addChild: function(view) {
    if (this.children[view.cid]) {
      return view;
    }

    view.retain();
    this.children[view.cid] = view;
    // _helperOptions is used to detect if is HelperView
    // we do not want to remove child in this case as
    // we are adding the HelperView to the declaring view
    // (whatever view used the view helper in it's template)
    // but it's parent will not equal the declaring view
    // in the case of a nested helper, which will cause an error.
    // In either case it's not necessary to ever call
    // _removeChild on a HelperView as _addChild should only
    // be called when a HelperView is created.
    if (view.parent && view.parent !== this && !view._helperOptions) {
      view.parent._removeChild(view);
    }
    view.parent = this;
    this.trigger('child', view);
    return view;
  },

  _removeChild: function(view) {
    delete this.children[view.cid];
    view.parent = null;
    view.release();
    return view;
  },

  _destroy: function() {
    this.trigger('destroyed');
    delete viewsIndexedByCid[this.cid];

    this.stopListening();
    this.off();

    _.each(this.children, function(child) {
      child.parent = null;
      child.release();
    });

    if (this.el) {
      this.undelegateEvents();
      this.$el.remove();

      ServerMarshal.destroy(this.$el);
    }

    // Absolute worst case scenario, kill off some known fields to minimize the impact
    // of being retained.
    this.el = this.$el =
      this.parent = this.children =
      this.model = this.collection = this._collection =
      this._boundDataObjectsByCid = this._objectOptionsByCid =
      this._helperOptions = undefined;
  },

  restore: function(element, forceRerender) {
    // Extract from $ objects if passed
    element = element[0] || element;

    if (this._renderCount) {
      // Ensure that we are registered to the right cid (this could have been reset previously)
      var oldCid = this.$el.attr('data-view-cid');
      if (this.cid !== oldCid) {
        this._assignCid(oldCid);
      }

      $(element).replaceWith(this.$el);

      this.trigger('restore:fail', {
        type: 'previously-rendered',
        view: this,
        element: element
      });
      return;
    }

    this.setElement(element);

    var restoreable = this.$el.attr('data-view-restore') === 'true';
    this.$el.removeAttr('data-view-restore');

    if (!$serverSide && restoreable) {
      // Ensure that our associated template is wired up so that helpers who need to
      // resolve template children are able to do so.
      assignTemplate(this, 'template', {
        required: false
      });

      this._renderCount = 1;
      this.trigger('restore', forceRerender);

      if (forceRerender) {
        // We have an explicit rerender that we wanted to defer until the end of the restore process
        this.render();
      } else {
        // Check to see if we are in a partial restore situation
        var remainingViews = this.$('[data-view-restore]'),
            rerender = _.filter(remainingViews, function(el) {
              // Ignore views that are deeply nested or views that are under a layout element
              // when checking to see if we need to rerender.
              var parent = $(el).parent();
              return !parent.attr('data-layout-cid') && (parent.view({el: true, helper: true})[0] === element);
            });
        if (rerender.length) {
          this.trigger('restore:fail', {
            type: 'remaining',
            view: this,
            element: element,
            rerendered: rerender
          });

          this.render();
        }
      }

      this.trigger('after-restore', forceRerender);

      return true;
    } else {
      this.trigger('restore:fail', {
        type: 'not-restorable',
        view: this,
        element: element
      });

      this.render();
    }
  },

  render: function(output, callback) {
    var self = this;
    // NOP for destroyed views
    if (!self.el) {
      return self;
    }

    Thorax.runSection('thorax-render', {name: self.name}, function render() {
      if (self._rendering) {
        // Nested rendering of the same view instances can lead to some very nasty issues with
        // the root render process overwriting any updated data that may have been output in the child
        // execution. If in a situation where you need to rerender in response to an event that is
        // triggered sync in the rendering lifecycle it's recommended to defer the subsequent render
        // or refactor so that all preconditions are known prior to exec.
        throw createError('nested-render');
      }

      self._rendering = true;

      var deferrable = new Deferrable(callback),
          children = {},
          previous = [];

      _.each(self.children, function(child, key) {
        if (!child._helperOptions) {
          children[key] = child;
        } else {
          child._cull = true;
          previous.push(child);
        }
      });
      self.children = children;
      self._previousHelpers = previous;

      // Emulating triggerDeferrable here, without creating a separate deferrable context
      self.trigger('before:rendered', deferrable);
      deferrable.exec(function() {
        if (_.isUndefined(output) || (!_.isElement(output) && !Thorax.Util.is$(output) && !(output && output.el) && !_.isString(output) && !_.isFunction(output))) {
          // try one more time to assign the template, if we don't
          // yet have one we must raise
          assignTemplate(self, 'template', {
            required: true
          });
          output = self.renderTemplate(self.template);
        } else if (_.isFunction(output)) {
          output = self.renderTemplate(output);
        }
      });

      deferrable.exec(function() {
        // Destroy any helpers that may be lingering
        _.each(previous, function(child) {
          if (child._cull) {
            self._removeChild(child);
          }
        });
        self._previousHelpers = undefined;

        if ($serverSide) {
          if (self.$el.attr(viewRestoreAttribute) !== 'false') {
            self.$el.attr(viewRestoreAttribute, $serverSide);
          }
        } else {
          self.$el.removeAttr(viewRestoreAttribute);
        }
      });

      deferrable.chain(function(next) {
        //accept a view, string, Handlebars.SafeString or DOM element
        self.html((output && output.el) || (output && output.string) || output, next);
      });

      deferrable.exec(function() {
        ++self._renderCount;

        self.trigger('rendered');
        self._rendering = false;
      });
      deferrable.run();
    });

    return self;
  },

  context: function() {
    return this.model && this.model.attributes;
  },

  _getContext: function() {
    var context = Object.create ? Object.create(this) : _.clone(this);
    return _.extend(context, this.context.call ? this.context() : this.context);
  },

  // Private variables in handlebars / options.data in template helpers
  _getData: function(data) {
    return {
      view: this,
      root: data,
      cid: _.uniqueId('t'),
      yield: function() {
        // fn is seeded by template helper passing context to data
        return data.fn && data.fn(data);
      }
    };
  },

  renderTemplate: function(file, context, ignoreErrors) {
    var template;
    if (_.isFunction(file)) {
      template = file;
    } else {
      template = Thorax.Util.getTemplate(file, ignoreErrors);
    }
    if (!template || template === Handlebars.VM.noop) {
      return '';
    } else {
      context = context || this._getContext();

      return template(context, {
        helpers: this.helpers,
        data: this._getData(context)
      });
    }
  },

  ensureRendered: function(callback) {
    if (!this._renderCount) {
      this.render(undefined, callback);
    } else if (callback) {
      setImmediate(callback);
    }
  },
  shouldRender: function(flag) {
    // Render if flag is truthy or if we have already rendered and flag is undefined/null
    return flag || (flag == null && this._renderCount);
  },
  conditionalRender: function(flag) {
    if (this.shouldRender(flag)) {
      this.render();
    }
  },

  appendTo: function(el) {
    this.ensureRendered();
    $(el).append(this.el);
    this.trigger('ready', {target: this});
  },

  html: function(html, callback) {
    if (_.isUndefined(html)) {
      return this.$el.html();
    } else {
      this.trigger('before:append');
      var element = this._replaceHTML(html);
      this.triggerDeferrable('append', undefined, undefined, callback);
      return element;
    }
  },

  release: function() {
    --this._referenceCount;
    if (this._referenceCount <= 0) {
      this._destroy();
    }
  },

  retain: function(owner) {
    if (!viewsIndexedByCid[this.cid]) {
      // Register with the `$.view` helper.
      viewsIndexedByCid[this.cid] = this;
    }

    ++this._referenceCount;
    if (owner) {
      // Not using listenTo helper as we want to run once the owner is destroyed
      this.listenTo(owner, 'destroyed', owner.release);
    }
  },

  _replaceHTML: function(html) {
    // We want to pull our elements out of the tree if we are under jQuery
    // or IE as both have the tendancy to mangle the elements we want to reuse
    // on cleanup. This could leak event binds if users are performing custom binds
    // but this generally not recommended.
    if (this._renderCount && (isIE || $.fn.jquery)) {
      while (this.el.hasChildNodes()) {
        this.el.removeChild(this.el.childNodes[0]);
      }
    }

    this.$el.empty();
    return this.$el.append(html);
  },

  _anchorClick: function(event) {
    var target = $(event.currentTarget),
        href = target.attr('href');

    // Don't push if meta or shift key are clicked
    if (event.metaKey || event.shiftKey) {
      return true;
    }

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

function configureView(view) {
  var options = view._constructorArg;

  view._referenceCount = 0;

  view._objectOptionsByCid = {};
  view._boundDataObjectsByCid = {};

  // Setup object event tracking
  _.each(inheritVars, function(obj) {
    view[obj.name] = [];
  });

  view.children = {};
  view._renderCount = 0;

  //this.options is removed in Thorax.View, we merge passed
  //properties directly with the view and template context
  if (options) {
    _.extend(view, options);
  }

  // Setup helpers
  bindHelpers(view);

  _.each(inheritVars, function(obj) {
    if (obj.configure) {
      obj.configure(view);
    }
  });

  view.trigger('configure');
}

function bindHelpers(view) {
  if (view.helpers) {
    _.each(view.helpers, function(helper, name) {
      view.helpers[name] = function() {
        var args = _.toArray(arguments),
            options = _.last(args);
        options.context = this;
        return helper.apply(view, args);
      };
    });
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
  if (el) {
    if (options.el) {
      return el;
    } else {
      var cid = el.attr(viewCidAttributeName),
          view = viewsIndexedByCid[cid];
      if (!view) {
        throw createError('fn-view-unregistered');
      }
      return view;
    }
  } else {
    return false;
  }
};
