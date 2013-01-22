/*global viewTemplateOverrides */
Handlebars.registerViewHelper('view', {
  factory: function(args, options) {
    var View = args.length >= 1 ? args[0] : Thorax.View;
    return Thorax.Util.getViewInstance(View, options.options);
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
