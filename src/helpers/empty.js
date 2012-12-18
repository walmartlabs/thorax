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
      empty = !this.parent.model || (this.parent.model && !this.parent.model.isEmpty());
    } else if (!collection) {
      empty = true;
    } else {
      empty = collection.isEmpty();
    }
    if (empty) {
      this.parent.trigger('rendered:empty', this, collection);
      return _render.call(this, this.template);
    } else {
      return _render.call(this, this.inverse);
    }
  };

  //no model binding is necessary as model.set() will cause re-render
  if (collection) {
    function collectionRemoveCallback() {
      if (collection.length === 0) {
        view.render();
      }
    }
    function collectionAddCallback() {
      if (collection.length === 1) {
        view.render();
      }
    }
    function collectionResetCallback() {
      view.render();
    }

    view.on(collection, 'remove', collectionRemoveCallback);
    view.on(collection, 'add', collectionAddCallback);
    view.on(collection, 'reset', collectionResetCallback);
  }

  view.render();
});
