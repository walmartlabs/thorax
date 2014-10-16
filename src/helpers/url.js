Handlebars.registerHelper('url', function(_url, options) {
  var url = _url || '';

  var fragment = '';
  if (arguments.length > 2) {
    for (var i = 0, len = arguments.length - 1; i < len; i++) {
      fragment += (i ? '/' : '') + encodeURIComponent(arguments[i]);
    }
  } else {
    var hash = (options && options.hash) || options;
    if (hash && hash['expand-tokens']) {
      fragment = Thorax.Util.expandToken(url, this, true);
    } else {
      fragment = url;
    }
  }
  if (Backbone.history._hasPushState) {
    var root = Backbone.history.options.root;
    if (root === '/' && fragment.substr(0, 1) === '/') {
      return fragment;
    } else {
      return root + fragment;
    }
  } else {
    return '#' + fragment;
  }
});
