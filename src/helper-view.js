/*global viewHelperAttributeName */
var viewPlaceholderAttributeName = 'data-view-tmp';

Thorax.HelperView = Thorax.View.extend({
  _ensureElement: function() {
    Thorax.View.prototype._ensureElement.apply(this, arguments);
    this.$el.attr(viewHelperAttributeName, this._helperName);
  },
  _getContext: function() {
    return this.parent._getContext.apply(this.parent, arguments);
  }
});

//ensure nested inline helpers will always have this.parent
//set to the view containing the template
function getParent(parent) {
  while (parent._helperName) {
    parent = parent.parent;
  }
  return parent;
}

Handlebars.registerViewHelper = function(name, ViewClass, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
    ViewClass = Thorax.HelperView;
  }
  Handlebars.registerHelper(name, function() {
    var args = _.toArray(arguments),
        options = args.pop(),
        declaringView = getOptionsData(options).view;

    var classAttrs = {
      template: options.fn,
      inverse: options.inverse,
      options: options.hash,
      declaringView: declaringView,
      parent: getParent(declaringView),
      _helperName: name
    };

    options.hash.id && (classAttrs.id = options.hash.id);
    options.hash['class'] && (classAttrs.className = options.hash['class']);
    options.hash.className && (classAttrs.className = options.hash.className);
    options.hash.tag && (classAttrs.tagName = options.hash.tag);
    options.hash.tagName && (classAttrs.tagName = options.hash.tagName);
    if (ViewClass.modifyClassAttributes) {
      classAttrs = ViewClass.modifyClassAttributes(classAttrs);
    }
    var instance = new (ViewClass.extend(classAttrs));
    args.push(instance);
    declaringView.children[instance.cid] = instance;
    declaringView.trigger.apply(declaringView, ['helper', name].concat(args));
    declaringView.trigger.apply(declaringView, ['helper:' + name].concat(args));
    var htmlAttributes = Thorax.Util.htmlAttributesFromOptions(options.hash);
    htmlAttributes[viewPlaceholderAttributeName] = instance.cid;
    callback.apply(this, args);
    return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes, ''));
  });
  var helper = Handlebars.helpers[name];
  return helper;
};
