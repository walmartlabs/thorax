/*global viewPlaceholderAttributeName */
var viewTemplateOverrides = {},
    allowedHTMLAttributes = ['tag', 'class', 'id', 'className', 'tagName'];

Handlebars.registerHelper('view', function(view, options) {
  if (arguments.length === 1) {
    options = view;
    view = Thorax.View;
  }
  var declaringView = getOptionsData(options).view,
      expandTokens = options.hash['expand-tokens'],
      instanceOptions,
      htmlAttributes;
  delete options.hash['expand-tokens'];
  _.each(options.hash, function(value, key) {
    if (allowedHTMLAttributes.indexOf(key) === -1) {
      if (!instanceOptions) {
        instanceOptions = {};
      }
      instanceOptions[key] = value;
    } else {
      if (!htmlAttributes) {
        htmlAttributes = {};
      }
      htmlAttributes[key] = value;
    }
  });
  var instance = Thorax.Util.getViewInstance(view, htmlAttributes);
  if (!instance) {
    return '';
  }
  var placeholderId = instance.cid;
  declaringView._addChild(instance);
  if (options.fn) {
    viewTemplateOverrides[placeholderId] = options.fn;
  }
  if (instanceOptions) {
    instance.set(instanceOptions);
  }
  htmlAttributes = htmlAttributes ? Thorax.Util.htmlAttributesFromOptions(htmlAttributes) : {};
  htmlAttributes[viewPlaceholderAttributeName] = placeholderId;
  return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes, undefined, expandTokens ? this : null));
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
