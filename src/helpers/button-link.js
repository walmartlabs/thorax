var callMethodAttributeName = 'data-call-method',
    triggerEventAttributeName = 'data-trigger-event';

Handlebars.registerHelper('button', function(method, options) {
  if (arguments.length === 1) {
    options = method;
    method = options.hash.method;
  }
  var hash = options.hash,
      expandTokens = hash['expand-tokens'];
  delete hash['expand-tokens'];
  if (!method && !options.hash.trigger) {
    throw new Error("button helper must have a method name as the first argument or a 'trigger', or a 'method' attribute specified.");
  }
  normalizeHTMLAttributeOptions(hash);
  hash.tagName = hash.tagName || 'button';
  hash.trigger && (hash[triggerEventAttributeName] = hash.trigger);
  delete hash.trigger;
  method && (hash[callMethodAttributeName] = method);
  return new Handlebars.SafeString(Thorax.Util.tag(hash, options.fn ? options.fn(this) : '', expandTokens ? this : null));
});

Handlebars.registerHelper('link', function() {
  var args = _.toArray(arguments),
      options = args.pop(),
      hash = options.hash,
      // url is an array that will be passed to the url helper
      url = args.length === 0 ? [hash.href] : args,
      expandTokens = hash['expand-tokens'];
  delete hash['expand-tokens'];
  if (!url[0] && url[0] !== '') {
    throw new Error("link helper requires an href as the first argument or an 'href' attribute");
  }
  normalizeHTMLAttributeOptions(hash);
  url.push(options);
  hash.href = Handlebars.helpers.url.apply(this, url);
  hash.tagName = hash.tagName || 'a';
  hash.trigger && (hash[triggerEventAttributeName] = options.hash.trigger);
  delete hash.trigger;
  hash[callMethodAttributeName] = '_anchorClick';
  return new Handlebars.SafeString(Thorax.Util.tag(hash, options.fn ? options.fn(this) : '', expandTokens ? this : null));
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

$(document).ready(function() {
  if (!Thorax._fastClickEventName) {
    registerClickHandler();
  }
});
