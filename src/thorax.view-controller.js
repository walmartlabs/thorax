(function() {
  
  var root = this,
      Backbone = root.Backbone,
      Thorax = root.Thorax,
      _ = root._,
      $ = root.$;

  //Router
  Thorax.Router = Backbone.Router.extend({
    initialize: function() {
      Backbone.history || (Backbone.history = new Backbone.History);
      Backbone.history.on('route', onRoute, this);
      //router does not have a built in destroy event
      //but ViewController does
      this.on('destroyed', function() {
        Backbone.history.off('route', onRoute, this);
      });
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
  Thorax.Util.createRegistryWrapper(Thorax.Router, Thorax.Routers);

  function onRoute(router, name) {
    if (this === router) {
      this.trigger.apply(this, ['route'].concat(Array.prototype.slice.call(arguments, 1)));
    }
  }

  //layout
  var layoutCidAttributeName = 'data-layout-cid';
  
  function generateRenderLayout(templateAttributeName) {
    templateAttributeName = templateAttributeName || 'template';
    return function(output) {
      //TODO: fixme, lumbar inserts templates after JS, most of the time this is fine
      //but Application will be created in init.js (unlike most views)
      //so need to put this here so the template will be picked up
      var layoutTemplate;
      if (this.name) {
        layoutTemplate = Thorax.Util.registryGet(Thorax, 'templates', this.name, true);
      }
      //a template is optional in a layout
      if (output || this[templateAttributeName] || layoutTemplate) {
        //but if present, it must have embedded an element containing layoutCidAttributeName 
        var response = Thorax.View.prototype.render.call(this, output || this[templateAttributeName] || layoutTemplate);
        ensureLayoutViewsTargetElement.call(this);
        return response;
      } else {
        ensureLayoutCid.call(this);
      }
    }
  }
  
  Thorax.LayoutView = Thorax.View.extend({
    render: generateRenderLayout(),
    setView: function(view, options) {
      options = _.extend({
        scroll: true,
        destroy: true
      }, options || {});
      if (typeof view === 'string') {
        view = new (Thorax.Util.registryGet(Thorax, 'Views', view, false));
      }
      this.ensureRendered();
      var oldView = this._view;
      if (view == oldView){
        return false;
      }
      if (options.destroy) {
        view._shouldDestroyOnNextSetView = true;
      }
      this.trigger('change:view:start', view, oldView, options);
      oldView && oldView.trigger('deactivated', options);
      view && view.trigger('activated', options);
      if (oldView && oldView.el && oldView.el.parentNode) {
        oldView.$el.remove();
      }
      //make sure the view has been rendered at least once
      view && view.ensureRendered();
      view && getLayoutViewsTargetElement.call(this).appendChild(view.el);
      this._view = view;
      oldView && oldView._shouldDestroyOnNextSetView && oldView.destroy();
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
  Thorax.ViewController = Thorax.LayoutView.extend();
  _.extend(Thorax.ViewController.prototype, Thorax.Router.prototype, {
    initialize: function() {
      Thorax.Router.prototype.initialize.call(this);
      //set the ViewController as the view on the parent
      //if a parent was specified
      this.on('route:before', function(router, name) {
        if (this.parent && this.parent.getView) {
          if (this.parent.getView() !== this) {
            this.parent.setView(this, {
              destroy: false
            });
          }
        }
      }, this);
      this._bindRoutes();
    }
  });

})();