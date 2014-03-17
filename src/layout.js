/*global
    $serverSide,
    createErrorMessage, emit, getLayoutViewsTargetElement, getOptionsData,
    normalizeHTMLAttributeOptions, viewNameAttributeName
*/
var layoutCidAttributeName = 'data-layout-cid';

Thorax.LayoutView = Thorax.View.extend({
  _defaultTemplate: Handlebars.VM.noop,
  render: function() {
    var response = Thorax.View.prototype.render.apply(this, arguments);
    if (this.template === Handlebars.VM.noop) {
      // if there is no template setView will append to this.$el
      ensureLayoutCid.call(this);
    } else {
      // if a template was specified is must declare a layout-element
      ensureLayoutViewsTargetElement.call(this);
    }
    return response;
  },
  setView: function(view, options) {
    options = _.extend({
      scroll: true
    }, options || {});

    if (_.isString(view)) {
      view = new (Thorax.Util.registryGet(Thorax, 'Views', view, false))();
    }

    if (!$serverSide && !this.hasBeenSet) {
      var existing = this.$('[' + viewNameAttributeName + '="' + view.name + '"]')[0];
      if (existing) {
        view.restore(existing);
      } else {
        $(this._layoutViewEl).empty();
      }
    }
    this.ensureRendered();

    var oldView = this._view, append, remove, complete;
    if (view === oldView) {
      return false;
    }
    this.trigger('change:view:start', view, oldView, options);

    remove = _.bind(function() {
      if (oldView) {
        oldView.$el && oldView.$el.detach();
        triggerLifecycleEvent.call(oldView, 'deactivated', options);
        this._removeChild(oldView);
      }
    }, this);

    append = _.bind(function() {
      if (!view) {
        this._view = undefined;
      } else if ($serverSide && !options.serverRender && !view.serverRender) {
        // Emit only data for non-server rendered views
        // But we do want to put ourselves into the queue for cleanup on future exec
        this._view = view;
        this._addChild(view);

        emit();
      } else {
        view.ensureRendered();
        options.activating = view;

        triggerLifecycleEvent.call(this, 'activated', options);
        view.trigger('activated', options);
        this._view = view;
        var targetElement = this._layoutViewEl;
        this._view.appendTo(targetElement);
        this._addChild(view);
      }
    }, this);

    complete = _.bind(function() {
      this.hasBeenSet = true;
      this.trigger('change:view:end', view, oldView, options);
    }, this);

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

Thorax.LayoutView.on('restore', ensureLayoutViewsTargetElement);

Handlebars.registerHelper('layout-element', function(options) {
  var view = getOptionsData(options).view;
  // duck type check for LayoutView
  if (!view.getView) {
    throw new Error(createErrorMessage('layout-element-helper'));
  }
  options.hash[layoutCidAttributeName] = view.cid;
  normalizeHTMLAttributeOptions(options.hash);
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, '', this));
});

function triggerLifecycleEvent(eventName, options) {
  options = options || {};
  options.target = this;
  this.trigger(eventName, options);
  _.each(this.children, function(child) {
    child.trigger(eventName, options);
  });
}

function ensureLayoutCid() {
  //set the layoutCidAttributeName on this.$el if there was no template
  this.$el.attr(layoutCidAttributeName, this.cid);
  this._layoutViewEl = this.el;
}

function ensureLayoutViewsTargetElement() {
  var el = this.$('[' + layoutCidAttributeName + '="' + this.cid + '"]')[0];
  if (!el && this.$el.attr(layoutCidAttributeName)) {
    el = this.el;
  }
  if (!el) {
    throw new Error('No layout element found in ' + (this.name || this.cid));
  }
  this._layoutViewEl = el;
}
