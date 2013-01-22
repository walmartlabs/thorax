/*global viewPlaceholderAttributeName */
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
