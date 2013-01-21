/*global getOptionsData, viewHelperAttributeName */
var viewPlaceholderAttributeName = 'data-view-tmp';

Thorax.HelperView = Thorax.View.extend({
  _ensureElement: function() {
    Thorax.View.prototype._ensureElement.apply(this, arguments);
    this.$el.attr(viewHelperAttributeName, this._helperName);
  },
  _getContext: function() {
    return this.parent._getContext.apply(this.parent, arguments);
  },
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

    var viewOptions = {
      template: options.fn || Handlebars.VM.noop,
      inverse: options.inverse,
      options: options.hash,
      declaringView: declaringView,
      parent: getParent(declaringView),
      _helperName: name,
      _helperOptions: {
        options: cloneHelperOptions(options),
        args: _.clone(args)
      }
    };

    options.hash.id && (viewOptions.id = options.hash.id);
    options.hash['class'] && (viewOptions.className = options.hash['class']);
    options.hash.className && (viewOptions.className = options.hash.className);
    options.hash.tag && (viewOptions.tagName = options.hash.tag);
    options.hash.tagName && (viewOptions.tagName = options.hash.tagName);
    var instance = new ViewClass(viewOptions);
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

function cloneHelperOptions(options) {
  var ret = _.pick(options, 'fn', 'inverse', 'hash', 'data');
  ret.data = _.omit(options.data, 'cid', 'view', 'yield');
  return ret;
}
