/*global viewPlaceholderAttributeName */
var viewTemplateOverrides = {};
Handlebars.registerHelper('view', function(view, options) {
  var declaringView = getOptionsData(options).view;
  if (arguments.length === 1) {
    options = view;
    view = Thorax.View;
  }
  var instance = Thorax.Util.getViewInstance(view, options ? options.hash : {});
  if (!instance) {
    return '';
  }
  var placeholderId = instance.cid,
      expandTokens = options.hash['expand-tokens'];
  declaringView._addChild(instance);
  delete options.hash['expand-tokens'];
  if (options.fn) {
    viewTemplateOverrides[placeholderId] = options.fn;
  }
  var htmlAttributes = Thorax.Util.htmlAttributesFromOptions(options.hash);
  htmlAttributes[viewPlaceholderAttributeName] = placeholderId;
  return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes, undefined, expandTokens ? this : null));
});

// IE will lose a reference to the elements if view.el.innerHTML = '';
// If they are removed one by one the references are not lost
Thorax.View.on('before:append', function() {
  if (this._renderCount > 0) {
    _.each(this.children, function(child, cid) {
      child.$el.remove();
    });
  }
});

Thorax.View.on('append', function(scope, callback) {
  (scope || this.$el).find('[' + viewPlaceholderAttributeName + ']').forEach(function(el) {
    var placeholderId = el.getAttribute(viewPlaceholderAttributeName),
        view = this.children[placeholderId];
    if (view) {
      //see if the view helper declared an override for the view
      //if not, ensure the view has been rendered at least once
      if (viewTemplateOverrides[placeholderId]) {
        view.render(viewTemplateOverrides[placeholderId]);
      } else {
        view.ensureRendered();
      }
      $(el).replaceWith(view.el);
      callback && callback(view.el);
    }
  }, this);
});
