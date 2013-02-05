/*global getOptionsData, viewHelperAttributeName */
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

Handlebars.registerViewHelper = function(name, ViewClass, callback) {
  if (arguments.length === 2) {
    if (ViewClass.factory) {
      callback = ViewClass.callback;
    } else {
      callback = ViewClass;
      ViewClass = Thorax.HelperView;
    }
  }
  Handlebars.registerHelper(name, function() {
    var args = _.toArray(arguments),
        options = args.pop(),
        declaringView = getOptionsData(options).view;

    var viewOptions = {
      template: options.fn || Handlebars.VM.noop,
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

    normalizeHTMLAttributeOptions(options.hash);
    _.extend(viewOptions, _.pick(options.hash, htmlAttributesToCopy));

    // Check to see if we have an existing instance that we can reuse
    var instance = _.find(declaringView._previousHelpers, function(child) {
      return compareHelperOptions(viewOptions, child);
    });

    // Create the instance if we don't already have one
    if (!instance) {
      if (ViewClass.factory) {
        instance = ViewClass.factory(args, viewOptions);
        if (!instance) {
          return '';
        }

        instance._helperName = viewOptions._helperName;
        instance._helperOptions = viewOptions._helperOptions;
      } else {
        instance = new ViewClass(viewOptions);
      }

      args.push(instance);
      declaringView._addChild(instance);
      declaringView.trigger.apply(declaringView, ['helper', name].concat(args));
      declaringView.trigger.apply(declaringView, ['helper:' + name].concat(args));

      callback && callback.apply(this, args);
    } else {
      declaringView._previousHelpers = _.without(declaringView._previousHelpers, instance);
      declaringView.children[instance.cid] = instance;
    }

    var htmlAttributes = _.pick(options.hash, htmlAttributesToCopy);
    htmlAttributes[viewPlaceholderAttributeName] = instance.cid;

    var expandTokens = options.hash['expand-tokens'];
    return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes, '', expandTokens ? this : null));
  });
  var helper = Handlebars.helpers[name];
  return helper;
};

Thorax.View.on('append', function(scope, callback) {
  (scope || this.$el).find('[' + viewPlaceholderAttributeName + ']').forEach(function(el) {
    var placeholderId = el.getAttribute(viewPlaceholderAttributeName),
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
      $(el).replaceWith(view.el);
      callback && callback(view.el);
    }
  }, this);
});


/**
 * Clones the helper options, dropping items that are known to change
 * between rendering cycles as appropriate.
 */
function cloneHelperOptions(options) {
  var ret = _.pick(options, 'fn', 'inverse', 'hash', 'data');
  ret.data = _.omit(options.data, 'cid', 'view', 'yield');
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
      && _.isEqual(_.keys(a.options), _.keys(b.options))
      && _.every(a.options, function(value, key) {
          if (key === 'data' || key === 'hash') {
            return compareValues(a.options[key], b.options[key]);
          } else if (key === 'fn' || key === 'inverse') {
            return b.options[key] === value
                || (value && _.has(value, 'program') && ((b.options[key] || {}).program === value.program));
          }
          return b.options[key] === value;
        });
}
