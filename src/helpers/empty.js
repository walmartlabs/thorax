Handlebars.registerViewHelper('empty', function(collection, view) {
  var empty, noArgument;
  if (arguments.length === 1) {
    view = collection;
    collection = false;
    noArgument = true;
  }

  var _render = view.render;
  view.render = function() {
    if (noArgument) {
      empty = !this.parent.model || this.parent.model.isEmpty();
    } else {
      empty = !collection || collection.isEmpty();
    }
    if (empty) {
      this.parent.trigger('rendered:empty', this, collection);
      return _render.call(this, this.template);
    } else {
      return _render.call(this, this.inverse);
    }
  };

  var render = _.bind(view.render, view);

  if (noArgument) {
    view.listenTo(view.parent, 'change:data-object', function(type, object, old) {
      if (type === 'model') {
        if (old) {
          view.stopListening(old);
        }
        if (object) {
          view.listenTo(object, 'change', render);
        }
        render();
      }
    });
    if (view.parent.model) {
      view.listenTo(view.parent.model, 'change', render);
    }
  } else if (collection) {
    view.listenTo(collection, 'remove', function() {
      if (collection.length === 0) {
        render();
      }
    });
    view.listenTo(collection, 'add', function() {
      if (collection.length === 1) {
        render();
      }
    });
    view.listenTo(collection, 'reset', render);
  }

  render();
});
