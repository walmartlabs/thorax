Handlebars.registerViewHelper('collection', Thorax.CollectionView, function(collection, view) {
  if (arguments.length === 1) {
    view = collection;
    collection = this._view.collection;
  }
  if (collection) {
    //item-view and empty-view may also be passed, but have no defaults
    _.extend(view.options, {
      'item-template': view.template && view.template !== Handlebars.VM.noop ? view.template : view.options['item-template'],
      'empty-template': view.inverse && view.inverse !== Handlebars.VM.noop ? view.inverse : view.options['empty-template'],
      'item-context': view.options['item-context'] || view.parent.itemContext,
      'empty-context': view.options['empty-context'] || view.parent.emptyContext,
      filter: view.options['filter']
    });
    view.setCollection(collection);

    {{#has-plugin "loading"}}
      //add "loading-view" and "loading-template" options to collection helper
      if (view.options['loading-view'] || view.options['loading-template']) {
        var item;
        var callback = Thorax.loadHandler(_.bind(function() {
          if (view.collection.length === 0) {
            view.$el.empty();
          }
          if (view.options['loading-view']) {
            var instance = Thorax.Util.getViewInstance(view.options['loading-view'], {
              collection: view.collection
            });
            view._addChild(instance);
            if (view.options['loading-template']) {
              instance.render(view.options['loading-template']);
            } else {
              instance.render();
            }
            item = instance;
          } else {
            item = view.renderTemplate(view.options['loading-template'], {
              collection: view.collection
            });
          }
          var index = view.options['loading-placement']
            ? view.options['loading-placement'].call(view.parent, view)
            : view.collection.length
          ;
          view.appendItem(item, index);
          view.$el.children().eq(index).attr('data-loading-element', view.collection.cid);
        }, this), _.bind(function() {
          view.$el.find('[data-loading-element="' + view.collection.cid + '"]').remove();
        }, this));
        view.on(view.collection, 'load:start', callback);
      }
    {{/has-plugin}}
  }
});
