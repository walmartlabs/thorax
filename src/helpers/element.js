var elementPlaceholderAttributeName = 'data-element-tmp';

Handlebars.registerHelper('element', function(element, options) {
  var cid = _.uniqueId('element'),
      htmlAttributes = Thorax.Util.htmlAttributesFromOptions(options.hash);
  htmlAttributes[elementPlaceholderAttributeName] = cid;
  this._view._elementsByCid || (this._view._elementsByCid = {});
  this._view._elementsByCid[cid] = element;
  return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes));
});

Thorax.View.prototype._appendElements = function(scope, callback) {
  (scope || this.$el).find('[' + elementPlaceholderAttributeName + ']').forEach(function(el) {
    var cid = el.getAttribute(elementPlaceholderAttributeName),
        element = this._elementsByCid[cid];
    if (_.isFunction(element)) {
      element = element.call(this._view);
    }
    $(el).replaceWith(element);
    callback && callback(element);
  }, this);
};
