/*global createRegistryWrapper */
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
    if (!callback) {
      callback = this[name];
    }
    //add a route:before event that is fired before the callback is called
    return Backbone.Router.prototype.route.call(this, route, name, function() {
      this.trigger.apply(this, ['route:before', route, name].concat(Array.prototype.slice.call(arguments)));
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

    if (oldView) {
      this._removeChild(oldView);
      oldView.$el.remove();
      oldView.trigger('deactivated', options);
      if (oldView._shouldDestroyOnNextSetView) {
        oldView.destroy();
      }
    }

    if (view) {
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

Handlebars.registerHelper('layout', function(options) {
  options.hash[layoutCidAttributeName] = getOptionsData(options).view.cid;
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
