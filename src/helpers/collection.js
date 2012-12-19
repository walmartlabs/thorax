Handlebars.registerViewHelper('collection', Thorax.CollectionView, function(collection, view) {
  if (arguments.length === 1) {
    view = collection;
    collection = view.declaringView.collection;
  }
  if (collection) {
    //item-view and empty-view may also be passed, but have no defaults
    _.extend(view.options, {
      'item-template': view.template && view.template !== Handlebars.VM.noop ? view.template : view.options['item-template'],
      'empty-template': view.inverse && view.inverse !== Handlebars.VM.noop ? view.inverse : view.options['empty-template']
    });
    view.setCollection(collection);
  }
});
