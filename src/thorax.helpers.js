(function() {

  var root = this,
      Backbone = root.Backbone,
      Handlebars = root.Handlebars,
      Thorax = root.Thorax,
      _ = root._,
      $ = root.$,
      paramMatcher = /:(\w+)/g,
      callMethodAttributeName = 'data-call-method';

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
    options.hash.tag = options.hash.tag || options.hash.tagName || 'button';
    options.hash[callMethodAttributeName] = method;
    return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, options.fn ? options.fn(this) : '', this));
  });
  
  Handlebars.registerHelper('link', function(url, options) {
    options.hash.tag = options.hash.tag || options.hash.tagName || 'a';
    options.hash.href = Handlebars.helpers.url.call(this, url);
    options.hash[callMethodAttributeName] = '_anchorClick';
    return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, options.fn ? options.fn(this) : '', this));
  });
  
  $(function() {
    $(document).on('click', '[' + callMethodAttributeName + ']', function(event) {
      var target = $(event.target),
          view = target.view({helper: false}),
          methodName = target.attr(callMethodAttributeName);
      view[methodName].call(view, event);
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
      event.preventDefault();
    }
  };

})();