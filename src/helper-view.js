/*global viewHelperAttributeName */
var viewPlaceholderAttributeName = 'data-view-tmp';

Thorax.HelperView = Thorax.View.extend({
  _ensureElement: function() {
    Thorax.View.prototype._ensureElement.apply(this, arguments);
    this.$el.attr(viewHelperAttributeName, this._helperName);
  },
  context: function() {
    return this.parent.context.apply(this.parent, arguments);
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
        options = args.pop();

    var viewOptions = {
      template: options.fn,
      inverse: options.inverse,
      options: options.hash,
      parent: getParent(this._view),
      _helperName: name
    };

    options.hash.id && (viewOptions.id = options.hash.id);
    options.hash['class'] && (viewOptions.className = options.hash['class']);
    options.hash.className && (viewOptions.className = options.hash.className);
    options.hash.tag && (viewOptions.tagName = options.hash.tag);
    options.hash.tagName && (viewOptions.tagName = options.hash.tagName);
    var instance = new ViewClass(viewOptions);
    args.push(instance);
    this._view.children[instance.cid] = instance;
    this._view.trigger.apply(this._view, ['helper', name].concat(args));
    this._view.trigger.apply(this._view, ['helper:' + name].concat(args));
    var htmlAttributes = Thorax.Util.htmlAttributesFromOptions(options.hash);
    htmlAttributes[viewPlaceholderAttributeName] = instance.cid;
    callback.apply(this, args);
    return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes, ''));
  });
  var helper = Handlebars.helpers[name];
  return helper;
};
