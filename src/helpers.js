var paramMatcher = /:(\w+)/g,
    callMethodAttributeName = 'data-call-method',
    triggerEventAttributeName = 'data-trigger-event';

Handlebars.registerHelper('url', function(url) {
  var matches = url.match(paramMatcher),
      context = this;
  if (matches) {
    url = url.replace(paramMatcher, function(match, key) {
      return context[key] ? Thorax.Util.getValue(context, key) : match;
    });
  }
  url = Thorax.Util.expandToken(url, context);
  return (Backbone.history._hasPushState ? Backbone.history.options.root : '#') + url;
});

Handlebars.registerHelper('button', function(method, options) {
  if (arguments.length === 1) {
    options = method;
    method = false;
  }
  if (!method && !options.hash.trigger) {
    throw new Error("button helper must have a method name as the first argument or a 'trigger' attribute specified.");
  }
  options.hash.tag = options.hash.tag || options.hash.tagName || 'button';
  options.hash.trigger && (options.hash[triggerEventAttributeName] = options.hash.trigger);
  delete options.hash.trigger;
  method && (options.hash[callMethodAttributeName] = method);
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, options.fn ? options.fn(this) : '', this));
});

Handlebars.registerHelper('link', function(url, options) {
  options.hash.tag = options.hash.tag || options.hash.tagName || 'a';
  options.hash.href = Handlebars.helpers.url.call(this, url);
  options.hash.trigger && (options.hash[triggerEventAttributeName] = options.hash.trigger);
  delete options.hash.trigger;
  options.hash[callMethodAttributeName] = '_anchorClick';
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, options.fn ? options.fn(this) : '', this));
});

$(function() {
  $(document).on({{#has-plugin "mobile"}}Thorax._fastClickEventName{{else}}'click'{{/has-plugin}}, '[' + callMethodAttributeName + '], [' + triggerEventAttributeName + ']', function(event) {
    var target = $(event.target),
        view = target.view({helper: false}),
        methodName = target.attr(callMethodAttributeName),
        eventName = target.attr(triggerEventAttributeName),
        methodResponse = false;
    methodName && (methodResponse = view[methodName].call(view, event));
    eventName && view.trigger(eventName, event);
    target.tagName === "A" && methodResponse === false && event.preventDefault();
  });
});

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
