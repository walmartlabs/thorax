Handlebars.registerViewHelper('loading', function(view) {
  var _render = view.render;
  view.render = function() {
    if (view.parent.$el.hasClass(view.parent._loadingClassName)) {
      return _render.call(this, view.fn);
    } else {
      return _render.call(this, view.inverse);
    }
  };
  var callback = _.bind(view.render, view);
  view.parent._loadingCallbacks = view.parent._loadingCallbacks || [];
  view.parent._loadingCallbacks.push(callback);
  view.on('deactivated', function() {
    view.parent._loadingCallbacks = _.without(view.parent._loadingCallbacks, callback);
  });
  view.render();
});
