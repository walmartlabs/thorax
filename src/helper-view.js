/*global
    ServerMarshal,
    $serverSide, createError, getOptionsData,
    normalizeHTMLAttributeOptions, viewHelperAttributeName
*/
var viewPlaceholderAttributeName = 'data-view-tmp',
    viewTemplateOverrides = {};

// Will be shared by HelperView and CollectionHelperView
var helperViewPrototype = {
  _ensureElement: function() {
    Thorax.View.prototype._ensureElement.apply(this, arguments);
    this.$el.attr(viewHelperAttributeName, this._helperName);
  },
  _getContext: function() {
    return this.parent._getContext.apply(this.parent, arguments);
  }
};

Thorax.HelperView = Thorax.View.extend(helperViewPrototype);

// Ensure nested inline helpers will always have this.parent
// set to the view containing the template
function getParent(parent) {
  // The `view` helper is a special case as it embeds
  // a view instead of creating a new one
  while (parent._helperName && parent._helperName !== 'view') {
    parent = parent.parent;
  }
  return parent;
}

function expandHash(context, hash) {
  if (hash['expand-tokens']) {
    delete hash['expand-tokens'];
    _.each(hash, function(value, key) {
      hash[key] = Thorax.Util.expandToken(value, context);
    });
    return true;
  }
}

Handlebars.registerViewHelper = function(name, ViewClass, callback) {
  if (arguments.length === 2) {
    if (ViewClass.factory) {
      callback = ViewClass.callback;
    } else {
      callback = ViewClass;
      ViewClass = Thorax.HelperView;
    }
  }

  var viewOptionWhiteList = ViewClass.attributeWhiteList;

  Handlebars.registerHelper(name, function() {
    var args = _.toArray(arguments),
        options = args.pop(),
        declaringView = getOptionsData(options).view;
 
    // Evaluate any nested parameters that we may have to content with
    var expandTokens = expandHash(this, options.hash);

    var viewOptions = createViewOptions(name, args, options, declaringView);
    setHelperTemplate(viewOptions, options, ViewClass);

    normalizeHTMLAttributeOptions(options.hash);
    var htmlAttributes = _.clone(options.hash);

    // Remap any view options per the whitelist and remove the source form the HTML
    _.each(viewOptionWhiteList, function(dest, source) {
      delete htmlAttributes[source];
      if (!_.isUndefined(options.hash[source])) {
        viewOptions[dest] = options.hash[source];
      }
    });
    if(htmlAttributes.tagName) {
      viewOptions.tagName = htmlAttributes.tagName;
    }

    viewOptions.attributes = function() {
      var attrs = (ViewClass.prototype && ViewClass.prototype.attributes) || {};
      if (_.isFunction(attrs)) {
        attrs = attrs.apply(this, arguments);
      }
      _.extend(attrs, _.omit(htmlAttributes, ['tagName']));
      // backbone wants "class"
      if (attrs.className) {
        attrs['class'] = attrs.className;
        delete attrs.className;
      }
      return attrs;
    };


    // Check to see if we have an existing instance that we can reuse
    var instance = _.find(declaringView._previousHelpers, function(child) {
      return child._cull && compareHelperOptions(viewOptions, child);
    });

    // Create the instance if we don't already have one
    if (!instance) {
      instance = getHelperInstance(args, viewOptions, ViewClass);
      if (!instance) {
        return '';
      }

      instance.$el.attr('data-view-helper-restore', name);

      if ($serverSide && instance.$el.attr('data-view-restore') !== 'false') {
        try {
          ServerMarshal.store(instance.$el, 'args', args, options.ids, options);
          ServerMarshal.store(instance.$el, 'attrs', options.hash, options.hashIds, options);
          if (options.fn && options.fn !== Handlebars.VM.noop) {
            ServerMarshal.store(instance.$el, 'fn', options.fn.program);
          }
          if (options.inverse && options.inverse !== Handlebars.VM.noop) {
            ServerMarshal.store(instance.$el, 'inverse', options.inverse.program);
          }
        } catch (err) {
          instance.$el.attr('data-view-restore', 'false');

          instance.trigger('restore:fail', {
            type: 'serialize',
            view: instance,
            err: err
          });
        }
      }

      helperInit(args, instance, callback, viewOptions);
    } else {
      if (!instance.el) {
        throw new Error('insert-destroyed');
      }

      declaringView.children[instance.cid] = instance;
    }

    // Remove any possible entry in previous helpers in case this is a cached value returned from
    // slightly different data that does not qualify for the previous helpers direct reuse.
    // (i.e. when using an array that is modified between renders)
    instance._cull = false;

    // Register the append helper if not already done
    if (!declaringView._pendingAppend) {
      declaringView._pendingAppend = true;
      declaringView.once('append', helperAppend);
    }

    htmlAttributes[viewPlaceholderAttributeName] = instance.cid;
    if (ViewClass.modifyHTMLAttributes) {
      ViewClass.modifyHTMLAttributes(htmlAttributes, instance);
    }
    return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes, '', expandTokens ? this : null));
  });
  var helper = Handlebars.helpers[name];

  helper.restore = function(declaringView, el) {
    var context = declaringView.context(),
        args = ServerMarshal.load(el, 'args', declaringView, context) || [],
        attrs = ServerMarshal.load(el, 'attrs', declaringView, context) || {};

    var options = {
      hash: attrs,
      fn: ServerMarshal.load(el, 'fn'),
      inverse: ServerMarshal.load(el, 'inverse')
    };

    declaringView.template._setup({helpers: this.helpers});

    if (options.fn) {
      options.fn = declaringView.template._child(options.fn);
    }
    if (options.inverse) {
      options.inverse = declaringView.template._child(options.inverse);
    }

    var viewOptions = createViewOptions(name, args, options, declaringView);
    setHelperTemplate(viewOptions, options, ViewClass);

    if (viewOptionWhiteList) {
      _.each(viewOptionWhiteList, function(dest, source) {
        if (!_.isUndefined(attrs[source])) {
          viewOptions[dest] = attrs[source];
        }
      });
    }

    var instance = getHelperInstance(args, viewOptions, ViewClass);
    instance._assignCid(el.getAttribute('data-view-cid'));
    helperInit(args, instance, callback, viewOptions);

    instance.restore(el);

    return instance;
  };

  return helper;
};

Thorax.View.on('restore', function() {
  var parent = this,
      context;

  function filterAncestors(parent, callback) {
    return function() {
      if ($(this).parent().view({el: true, helper: true})[0] === parent.el) {
        return callback.call(this);
      }
    };
   }

  parent.$('[data-view-helper-restore][data-view-restore=true]').each(filterAncestors(parent, function() {
    var helper = Handlebars.helpers[this.getAttribute('data-view-helper-restore')],
        child = helper.restore(parent, this);
    parent._addChild(child);
  }));
});

function createViewOptions(name, args, options, declaringView) {
  return {
    inverse: options.inverse,
    options: options.hash,
    declaringView: declaringView,
    parent: getParent(declaringView),
    _helperName: name,
    _helperOptions: {
      options: cloneHelperOptions(options),
      args: _.clone(args)
    }
  };
}

function setHelperTemplate(viewOptions, options, ViewClass) {
  if (options.fn) {
    // Only assign if present, allow helper view class to
    // declare template
    viewOptions.template = options.fn;
  } else if (ViewClass && ViewClass.prototype && !ViewClass.prototype.template) {
    // ViewClass may also be an instance or object with factory method
    // so need to do this check
    viewOptions.template = Handlebars.VM.noop;
  }
}

function getHelperInstance(args, viewOptions, ViewClass) {
  var instance;

  if (ViewClass.factory) {
    instance = ViewClass.factory(args, viewOptions);
    if (!instance) {
      return;
    }

    instance._helperName = viewOptions._helperName;
    instance._helperOptions = viewOptions._helperOptions;
  } else {
    instance = new ViewClass(viewOptions);
  }

  if (!instance.el) {
    // ViewClass.factory may return existing objects which may have been destroyed
    throw createError('insert-destroyed-factory');
  }
  return instance;
}
function helperInit(args, instance, callback, viewOptions) {
  var declaringView = viewOptions.declaringView,
      name = viewOptions._helperName;

  args.push(instance);
  declaringView._addChild(instance);
  declaringView.trigger.apply(declaringView, ['helper', name].concat(args));
  declaringView.trigger.apply(declaringView, ['helper:' + name].concat(args));

  callback && callback.apply(this, args);
}

function helperAppend(scope, callback) {
  this._pendingAppend = undefined;

  (scope || this.$el).find('[' + viewPlaceholderAttributeName + ']').forEach(function(el) {
    var $el = $(el),
        placeholderId = $el.attr(viewPlaceholderAttributeName),
        view = this.children[placeholderId];

    if (view) {
      //see if the view helper declared an override for the view
      //if not, ensure the view has been rendered at least once
      if (viewTemplateOverrides[placeholderId]) {
        view.render(viewTemplateOverrides[placeholderId]);
        delete viewTemplateOverrides[placeholderId];
      } else {
        view.ensureRendered();
      }
      $el.replaceWith(view.el);
      callback && callback(view.$el);
    }
  }, this);
}

/**
 * Clones the helper options, dropping items that are known to change
 * between rendering cycles as appropriate.
 */
function cloneHelperOptions(options) {
  var ret = _.pick(options, 'fn', 'inverse', 'hash', 'data');
  ret.data = _.omit(options.data, 'cid', 'view', 'yield', 'root', '_parent');

  // This is necessary to prevent failures when mixing restored and rendered data
  // as it forces the keys object to be complete.
  ret.fn = ret.fn || undefined;
  ret.inverse = ret.inverse || undefined;

  return ret;
}

/**
 * Checks for basic equality between two sets of parameters for a helper view.
 *
 * Checked fields include:
 *  - _helperName
 *  - All args
 *  - Hash
 *  - Data
 *  - Function and Invert (id based if possible)
 *
 * This method allows us to determine if the inputs to a given view are the same. If they
 * are then we make the assumption that the rendering will be the same (or the child view will
 * otherwise rerendering it by monitoring it's parameters as necessary) and reuse the view on
 * rerender of the parent view.
 */
function compareHelperOptions(a, b) {
  function compareValues(a, b) {
    return _.every(a, function(value, key) {
      return b[key] === value;
    });
  }

  if (a._helperName !== b._helperName) {
    return false;
  }

  a = a._helperOptions;
  b = b._helperOptions;

  // Implements a first level depth comparison
  return a.args.length === b.args.length
      && compareValues(a.args, b.args)
      && _.isEqual(_.keys(a.options).sort(), _.keys(b.options).sort())
      && _.every(a.options, function(value, key) {
          if (key === 'data' || key === 'hash') {
            return compareValues(a.options[key], b.options[key]);
          } else if (key === 'fn' || key === 'inverse') {
            if (b.options[key] === value) {
              return true;
            }

            var other = b.options[key] || {};
            return value && _.has(value, 'program') && !value.depth && other.program === value.program;
          }
          return b.options[key] === value;
        });
}
