var layoutCidAttributeName = 'data-layout-cid';

Thorax.LayoutView = Thorax.View.extend({
  render: function(output) {
    // TODO: fixme, lumbar inserts templates after JS, most of the time this is fine
    // but Application will be created in init.js (unlike most views)
    // so need to put this here so the template will be picked up
    assignTemplate.call(this, 'template', {
      required: false
    });
    // a template is optional in a layout
    if (output || this.template) {
      // but if present, it must have embedded an element containing layoutCidAttributeName 
      var response = Thorax.View.prototype.render.call(this, output || this.template);
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

    if (oldView) {
      this._removeChild(oldView);
      oldView.$el.remove();
      triggerLifecycleEvent.call(oldView, 'deactivated', options);
      if (oldView._shouldDestroyOnNextSetView) {
        oldView.destroy();
      }
    }

    if (view) {
      triggerLifecycleEvent.call(this, 'activated', options);
      view.trigger('activated', options);
      this._addChild(view);
      this._view = view;
      this._view.appendTo(getLayoutViewsTargetElement.call(this));
    } else {
      this._view = undefined;
    }

    this.trigger('change:view:end', view, oldView, options);
    return view;
  },

  getView: function() {
    return this._view;
  }
});

Handlebars.registerHelper('layout-element', function(options) {
  var view = getOptionsData(options).view;
  // duck type check for LayoutView
  if (!view.getView) {
    throw new Error('layout-element must be used within a LayoutView');
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
