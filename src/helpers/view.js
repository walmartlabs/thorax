/*global viewTemplateOverrides, createErrorMessage */
Handlebars.registerViewHelper('view', {
  factory: function(args, options) {
    var View = args.length >= 1 ? args[0] : Thorax.View;
    return Thorax.Util.getViewInstance(View, options.options);
  },
  // ensure generated placeholder tag in template
  // will match tag of view instance
  modifyHTMLAttributes: function(htmlAttributes, instance) {
    // Handle fruitloops tag name lookup via the .name case.
    htmlAttributes.tagName = (instance.el.tagName || instance.el.name || '').toLowerCase();
  },
  callback: function(view) {
    var instance = arguments[arguments.length-1],
        options = instance._helperOptions.options,
        placeholderId = instance.cid;
    // view will be the argument passed to the helper, if it was
    // a string, a new instance was created on the fly, ok to pass
    // hash arguments, otherwise need to throw as templates should
    // not introduce side effects to existing view instances
    if (!_.isString(view) && options.hash && _.keys(options.hash).length > 0) {
      throw new Error(createErrorMessage('view-helper-hash-args'));
    }
    if (options.fn) {
      viewTemplateOverrides[placeholderId] = options.fn;
    }
  }
});
