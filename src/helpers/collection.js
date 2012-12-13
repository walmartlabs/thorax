Handlebars.registerViewHelper('collection', Thorax.CollectionHelperView, function(collection, view) {
  if (arguments.length === 1) {
    view = collection;
    collection = this._view.collection;
  }
  // Need additional check here to see if it is the
  // primary collection as templates can do:
  // #collection this.collection
  if (collection === this._view.collection) {
    ensureCollectionCid(collection);
    view.$el.attr(primaryCollectionAttributeName, collection.cid);
  }
  collection && view.setCollection(collection);
});

Handlebars.registerHelper('collection-element', function(options) {
  options.hash.tag = options.hash.tag || options.hash.tagName || 'div';
  options.hash[collectionElementAttributeName] = true;
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, '', this));
});