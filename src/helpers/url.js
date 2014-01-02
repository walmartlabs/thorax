Handlebars.registerHelper('url', function(url) {
  url = url || '';

  var fragment;
  if (arguments.length > 2) {
    fragment = _.map(_.head(arguments, arguments.length - 1), encodeURIComponent).join('/');
  } else {
    var options = arguments[1],
        hash = (options && options.hash) || options;
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
