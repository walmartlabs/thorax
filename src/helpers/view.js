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

  var inlineLoading = options.hash['inline-loading'],
      inlineLoadingHeight = options.hash['inline-loading-height'];

  if (inlineLoading || inlineLoadingHeight) {
    htmlAttributes['data-inline-loading'] = (_.isString(inlineLoading) && inlineLoading) || 'inline-loading';
    if (inlineLoadingHeight) {
      htmlAttributes['data-inline-loading-height'] =
        (_.isString(inlineLoadingHeight) && inlineLoadingHeight) || (inlineLoadingHeight + 'px');
    }
  }

  return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes, undefined, expandTokens ? this : null));
});

Thorax.View.on('append', function(scope, callback) {
  (scope || this.$el).find('[' + viewPlaceholderAttributeName + ']').forEach(function(el) {
    var placeholderId = el.getAttribute(viewPlaceholderAttributeName),
        view = this.children[placeholderId];

    function insertView(el) {
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

    if (view) {
      var inlineLoading = el.getAttribute('data-inline-loading');
      if (inlineLoading) {
        var newEl = $(view.renderTemplate(inlineLoading));
        var height = el.getAttribute('data-inline-loading-height');
        if (height) {
          newEl.css('height', height);
        }
        $(el).replaceWith(newEl);
        view.on('loaded', function() {insertView(newEl);});
      } else {
        insertView(el);
      }
    }
  }, this);
});
