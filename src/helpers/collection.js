Handlebars.registerViewHelper('collection', Thorax.CollectionHelperView, function(collection, view) {
  if (arguments.length === 1) {
    view = collection;
    collection = view.declaringView.collection;
  }
  // Need additional check here to see if it is the
  // primary collection as templates can do:
  // #collection this.collection
  if (collection && collection === view.declaringView.collection) {
    ensureDataObjectCid('collection', collection);
    view.setAsPrimaryCollectionHelper(collection);
  }
  collection && view.setCollection(collection);
});

Handlebars.registerHelper('collection-element', function(options) {
  options.hash.tag = options.hash.tag || options.hash.tagName || 'div';
  options.hash[collectionElementAttributeName] = true;
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, '', this));
});
