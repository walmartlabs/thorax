var elementPlaceholderAttributeName = 'data-element-tmp';

Handlebars.registerHelper('element', function(element, options) {
  normalizeHTMLAttributeOptions(options.hash);
  var cid = _.uniqueId('element'),
      declaringView = getOptionsData(options).view,
      htmlAttributes = _.pick(options.hash, htmlAttributesToCopy);
  htmlAttributes[elementPlaceholderAttributeName] = cid;
  declaringView._elementsByCid || (declaringView._elementsByCid = {});
  declaringView._elementsByCid[cid] = element;
  return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes));
});

Thorax.View.on('append', function(scope, callback) {
  (scope || this.$el).find('[' + elementPlaceholderAttributeName + ']').forEach(function(el) {
    var $el = $(el),
        cid = $el.attr(elementPlaceholderAttributeName),
        element = this._elementsByCid[cid];
    // A callback function may be specified as the value
    if (_.isFunction(element)) {
      element = element.call(this);
    }
    $el.replaceWith(element);
    callback && callback(element);
  }, this);
});
