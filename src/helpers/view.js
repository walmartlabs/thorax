var viewTemplateOverrides = {};
Handlebars.registerHelper('view', function(view, options) {
  var declaringView = options.data.view;
  if (arguments.length === 1) {
    options = view;
    view = Thorax.View;
  }
  var instance = Thorax.Util.getViewInstance(view, options ? options.hash : {});
  if (!instance) {
    return '';
  }
  var placeholderId = instance.cid;
  declaringView._addChild(instance);
  declaringView.trigger('child', instance);
  if (options.fn) {
    viewTemplateOverrides[placeholderId] = options.fn;
  }
  var htmlAttributes = Thorax.Util.htmlAttributesFromOptions(options.hash);
  htmlAttributes[viewPlaceholderAttributeName] = placeholderId;
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, htmlAttributes));
});

Thorax.View.prototype._appendViews = function(scope, callback) {
  (scope || this.$el).find('[' + viewPlaceholderAttributeName + ']').forEach(function(el) {
    var placeholderId = el.getAttribute(viewPlaceholderAttributeName),
        view = this.children[placeholderId];
    if (view) {
      //see if the view helper declared an override for the view
      //if not, ensure the view has been rendered at least once
      if (viewTemplateOverrides[placeholderId]) {
        view.render(viewTemplateOverrides[placeholderId](view._getContext(), {
          data: {
            view: view
          }
        }));
      } else {
        view.ensureRendered();
      }
      $(el).replaceWith(view.el);
      callback && callback(view.el);
    }
  }, this);
};
