/*global normalizeHTMLAttributeOptions */
var elementPlaceholderAttributeName = 'data-element-tmp';

Handlebars.registerHelper('element', function(element, options) {
  normalizeHTMLAttributeOptions(options.hash);
  var cid = _.uniqueId('element'),
      declaringView = options.data.view;
  options.hash[elementPlaceholderAttributeName] = cid;
  declaringView._elementsByCid || (declaringView._elementsByCid = {});
  declaringView._elementsByCid[cid] = element;

  // Register the append helper if not already done
  if (!declaringView._pendingElement) {
    declaringView._pendingElement = true;
    declaringView.once('append', elementAppend);
  }

  return new Handlebars.SafeString(Thorax.Util.tag(options.hash));
});

function elementAppend(scope, callback) {
  this._pendingElement = undefined;

  var self = this;
  (scope || this.$el).find('[' + elementPlaceholderAttributeName + ']').forEach(function(el) {
    var $el = $(el),
        cid = $el.attr(elementPlaceholderAttributeName),
        element = self._elementsByCid[cid];
    // A callback function may be specified as the value
    if (_.isFunction(element)) {
      element = element.call(self);
    }
    $el.replaceWith(element);
    callback && callback($(element));
  });
}
