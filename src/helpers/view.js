/*global viewTemplateOverrides, generateAttributesGenerator, normalizeHTMLAttributeOptions */

Handlebars.registerViewHelper('view', {
  factory: function(args, options, htmlAttributes) {
    var ViewClass = args.length >= 1 ? args[0] : Thorax.View;
    // options.options are the options passed via the helper in the
    // template. Only create new instance with those as options
    // contains helperName, declaringView, etc. Do not want to treat
    // embedded views as helper views.
    // Also want to create view with passed HTML options so if tag
    // class or id is specified, will be preserved
    var viewOptions = _.clone(options.options);
    normalizeHTMLAttributeOptions(viewOptions);
    var whiteListOptionKeys = _.keys(defaultViewOptionWhiteList)
    viewOptions = _.omit(htmlAttributes, whiteListOptionKeys);
    htmlAttributes = _.pick(htmlAttributes, whiteListOptionKeys);
    
    // tagName is a special case
    if (htmlAttributes.tagName) {
      viewOptions.tagName = htmlAttributes.tagName;
      delete htmlAttributes.tagName;
    }
    if (ViewClass && ViewClass.cid && ViewClass.$el) {
      // unnormalize className for existing instance
      var htmlAttributesForInstance = _.clone(htmlAttributes);
      if (htmlAttributesForInstance.className) {
        htmlAttributesForInstance['class'] = htmlAttributesForInstance.className;
        delete htmlAttributesForInstance.className;
      }
      ViewClass.$el.attr(htmlAttributesForInstance);
    } else {
      viewOptions.attributes = generateAttributesGenerator(ViewClass, htmlAttributes);
      viewOptions._destroyOnScopeChange = true;
    }
    var instance = Thorax.Util.getViewInstance(ViewClass, viewOptions);
    return instance;
  },
  callback: function() {
    var instance = arguments[arguments.length-1],
        options = instance._helperOptions.options,
        placeholderId = instance.cid;

    if (options.fn) {
      viewTemplateOverrides[placeholderId] = options.fn;
    }
  }
});
