var callMethodAttributeName = 'data-call-method',
    triggerEventAttributeName = 'data-trigger-event';

Handlebars.registerHelper('url', function(fragment) {
  var fragment,
      context = this;
  if (arguments.length > 2) {
    fragment = _.map(_.head(arguments, arguments.length - 1), encodeURIComponent).join('/');
  }
  fragment = Thorax.Util.expandToken(fragment, context);
  return (Backbone.history._hasPushState ? Backbone.history.options.root : '#') + fragment;
});

Handlebars.registerHelper('button', function(method, options) {
  if (arguments.length === 1) {
    options = method;
    method = options.hash.method;
  }
  if (!method && !options.hash.trigger) {
    throw new Error("button helper must have a method name as the first argument or a 'trigger', or a 'method' attribute specified.");
  }
  options.hash.tag = options.hash.tag || options.hash.tagName || 'button';
  options.hash.trigger && (options.hash[triggerEventAttributeName] = options.hash.trigger);
  delete options.hash.trigger;
  method && (options.hash[callMethodAttributeName] = method);
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, options.fn ? options.fn(this) : '', this));
});

Handlebars.registerHelper('link', function(url, options) {
  if (arguments.length === 1) {
    options = url;
    url = options.hash.href;
  }
  if (!url) {
    throw new Error("link helper requires an href as the first argument or an 'href' attribute");
  }
  options.hash.tag = options.hash.tag || options.hash.tagName || 'a';
  options.hash.href = Handlebars.helpers.url.call(this, url || options.hash.href);
  options.hash.trigger && (options.hash[triggerEventAttributeName] = options.hash.trigger);
  delete options.hash.trigger;
  options.hash[callMethodAttributeName] = '_anchorClick';
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, options.fn ? options.fn(this) : '', this));
});

var clickSelector = '[' + callMethodAttributeName + '], [' + triggerEventAttributeName + ']';

function handleClick(event) {
  var target = $(event.target),
      view = target.view({helper: false}),
      methodName = target.attr(callMethodAttributeName),
      eventName = target.attr(triggerEventAttributeName),
      methodResponse = false;
  methodName && (methodResponse = view[methodName].call(view, event));
  eventName && view.trigger(eventName, event);
  target.tagName === "A" && methodResponse === false && event.preventDefault();
}

var lastClickHandlerEventName;

function registerClickHandler() {
  unregisterClickHandler();
  lastClickHandlerEventName = Thorax._fastClickEventName || 'click';
  $(document).on(lastClickHandlerEventName, clickSelector, handleClick);
}

function unregisterClickHandler() {
  lastClickHandlerEventName && $(document).off(lastClickHandlerEventName, clickSelector, handleClick);
}

{{^has-plugin "mobile"}}
  $(registerClickHandler);
{{/has-plugin}}

Thorax.View.prototype._anchorClick = function(event) {
  var target = $(event.currentTarget),
      href = target.attr('href');
  // Route anything that starts with # or / (excluding //domain urls)
  if (href && (href[0] === '#' || (href[0] === '/' && href[1] !== '/'))) {
    Backbone.history.navigate(href, {
      trigger: true
    });
    return false;
  }
  return true;
};
