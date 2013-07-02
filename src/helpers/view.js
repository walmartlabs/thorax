/*global viewTemplateOverrides */
Handlebars.registerViewHelper('view', {
  factory: function(args, options) {
    var ViewClass = args.length >= 1 ? args[0] : Thorax.View;
    if (!Thorax.Util.isViewInstance(ViewClass)) {
      options.options._destroyOnScopeChange = true;
    }
    return Thorax.Util.getViewInstance(ViewClass, options.options);
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
