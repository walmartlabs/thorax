/*global
    $serverSide, FruitLoops,
    createErrorMessage, getLayoutViewsTargetElement,
    normalizeHTMLAttributeOptions, setImmediate, viewNameAttributeName
*/
var layoutCidAttributeName = 'data-layout-cid';

Thorax.LayoutView = Thorax.View.extend({
  _defaultTemplate: Handlebars.VM.noop,
  render: function(output) {
    var response = Thorax.View.prototype.render.call(this, output);
    if (this.template === Handlebars.VM.noop) {
      // if there is no template setView will append to this.$el
      ensureLayoutCid(this);
    } else {
      // if a template was specified is must declare a layout-element
      ensureLayoutViewsTargetElement(this);
    }
    return response;
  },
  restore: function(element, forceRerender) {
    // Layout views don't have a traditional forced rerender cycle so we want to manage this
    // ourselves.
    this._forceRerender = forceRerender;
    Thorax.View.prototype.restore.call(this, element);
  },
  setView: function(view, options) {
    options = _.extend({
      scroll: true
    }, options);

    if (_.isString(view)) {
      view = new (Thorax.Util.registryGet(Thorax, 'Views', view, false))();
    }

    if (!$serverSide && !this.hasBeenSet) {
      var existing = this.$('[' + viewNameAttributeName + '="' + view.name + '"]')[0];
      if (existing) {
        view.restore(existing, this._forceRerender);
      } else {
        $(this._layoutViewEl).empty();
      }
    }
    this.ensureRendered();

    var oldView = this._view,
        self = this,
        serverRender = view && $serverSide && (options.serverRender || view.serverRender),
        attemptAsync = options.async !== false ? options.async || serverRender : false;
    if (view === oldView) {
      return false;
    }

    if (attemptAsync && view && !view._renderCount) {
      setImmediate(function() {
        view.ensureRendered(function() {
          self.setView(view, options);
        });
      });
      return;
    }

    this.trigger('change:view:start', view, oldView, options);

    function remove() {
      if (oldView) {
        oldView.$el && oldView.$el.detach();
        triggerLifecycleEvent(oldView, 'deactivated', options);
        self._removeChild(oldView);
      }
    }

    function append() {
      if (!view) {
        self._view = undefined;
      } else if ($serverSide && !serverRender) {
        // Emit only data for non-server rendered views
        // But we do want to put ourselves into the queue for cleanup on future exec
        self._view = view;
        self._addChild(view);

        FruitLoops.emit();
      } else {
        view.ensureRendered();
        options.activating = view;

        triggerLifecycleEvent(self, 'activated', options);
        view.trigger('activated', options);
        self._view = view;
        var targetElement = self._layoutViewEl;
        self._view.appendTo(targetElement);
        self._addChild(view);
      }
    }

    function complete() {
      self.hasBeenSet = true;
      self.trigger('change:view:end', view, oldView, options);
    }

    if (!options.transition) {
      remove();
      append();
      complete();
    } else {
      options.transition(view, oldView, append, remove, complete);
    }

    return view;
  },

  getView: function() {
    return this._view;
  }
});

Thorax.LayoutView.on('after-restore', function() {
  ensureLayoutViewsTargetElement(this);
});

Handlebars.registerHelper('layout-element', function(options) {
  var view = options.data.view;
  // duck type check for LayoutView
  if (!view.getView) {
    throw new Error(createErrorMessage('layout-element-helper'));
  }
  options.hash[layoutCidAttributeName] = view.cid;
  normalizeHTMLAttributeOptions(options.hash);
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, '', this));
});

function triggerLifecycleEvent(view, eventName, options) {
  options = options || {};
  options.target = view;
  view.trigger(eventName, options);
  _.each(view.children, function(child) {
    child.trigger(eventName, options);
  });
}

function ensureLayoutCid(view) {
  //set the layoutCidAttributeName on this.$el if there was no template
  view.$el.attr(layoutCidAttributeName, view.cid);
  view._layoutViewEl = view.el;
}

function ensureLayoutViewsTargetElement(view) {
  var el = view.$('[' + layoutCidAttributeName + '="' + view.cid + '"]')[0];
  if (!el && view.$el.attr(layoutCidAttributeName)) {
    el = view.el;
  }
  if (!el) {
    throw new Error('No layout element found in ' + (view.name || view.cid));
  }
  view._layoutViewEl = el;
}
