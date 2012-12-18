var elementPlaceholderAttributeName = 'data-element-tmp';

Handlebars.registerHelper('element', function(element, options) {
  var cid = _.uniqueId('element'),
      declaringView = options.data.view,
      htmlAttributes = Thorax.Util.htmlAttributesFromOptions(options.hash);
  htmlAttributes[elementPlaceholderAttributeName] = cid;
  declaringView._elementsByCid || (declaringView._elementsByCid = {});
  declaringView._elementsByCid[cid] = element;
  return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes));
});

Thorax.View.on('append', function(scope, callback) {
  (scope || this.$el).find('[' + elementPlaceholderAttributeName + ']').forEach(function(el) {
    var cid = el.getAttribute(elementPlaceholderAttributeName),
        element = this._elementsByCid[cid];
    // A callback function may be specified as the vaue
    if (_.isFunction(element)) {
      element = element.call(this);
    }
    $(el).replaceWith(element);
    callback && callback(element);
  }, this);
});
