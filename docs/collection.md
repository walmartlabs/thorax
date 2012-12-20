Thorax Collection Plugin
========================

Adds view helpers and classes to support collection bindings in. See the [Todos example](http://jsfiddle.net/QDMyk/) to see the collection plugin in action.

## View Helpers

### collection *{{collection [collectionObj] [options]}}*

Creates and embeds a `CollectionView` instance, updating when items are added, removed or changed in the collection. If a block is passed it will be used as the `item-template`, which will be called with a context of the `model.attributes` for each model in the collection.

    {{#collection cats}}
      {{name}}
    {{/collection}}

Options may be arbitrary HTML attributes, a `tag` option to specify the type of tag containing the collection, or any of the following:

- `item-template` - *required* A template to display for each model. If a block is specified it will become the item-template. Defaults to view.name + '-item'
- `item-view` - A view to create for each model. Defaults to view.name + '-item'
- `item-context` - A function in the declaring view to specify the context for an item-template, recieves model and index as arguments. If the view has an `itemContext` function it will be used as the default.
- `empty-template` - A template to display when the collection is empty. If an inverse block is specified it will become the empty-template. Defaults to view.name + '-empty'
- `empty-view` - A view to display when the collection is empty. Defaults to view.name + '-empty'
- `empty-context` - A function in the declaring view to specify the context that the empty-template is rendered with. If the view has an `emptyContext` function it will be used as the default, otherwise `parent.context` will be used by default.
- `empty-class` - A class name to add and remove from the collection view's `el` depending on wether or not the collection is empty.
- `loading-template` - Only available if the loading plugin has been included. A template to append when the collection is loading.
- `loading-view` - Only available if loading plugin has been included. A view to append when the collection is loading
- `loading-placement` - Only available if loading plugin has been included. A method on the declaring view that will recieve the collection view instance as the only argument and must return the index where the loading view or template should be placed. Defaults to `view.collection.length`, placing the view or template at the end.
- `filter` - A method on the declaring view, which will filter which items are rendered. Recieves (model, index) and must return boolean. The filter will be applied when models' fire a change event, or models are added and removed from the collection. To force a collection to re-filter, trigger a `filter` event on the collection.

Any of the options can be specified as variables in addition to strings:

    {{collection cats item-view=itemViewClass}}

If you need a reference to a specific CollectionView you can create it directly (see `Thorax.CollectionView` below) or use the `helper:collection` event when creating them via a helper:

    view.on("helper:collection", function(collection, collectionView) {

    });

### empty *{{#empty [collection]}}*

Creates and embeds a `HelperView` that will be updated dependening on wether the collection is empty or not. If no collection is specified it will default to the view's model if present.

    {{#empty cats}}
      No cats!
    {{else}}
      {{#collection cats}}{{/collection}}
    {{/empty}}

To embed a row within a `collection` helper if it the collection is empty the `empty-view`, `empty-template` or `else` block of the `collection` helper can be used:

    {{#collection cats}}
      A cat.
    {{else}}
      No cats!
    {{/collection}}

## View Events

The collection plugin extends the events plugin by allowing a `collection` hash of events to be specified in the View `events` object or to a view's `on` method. When a collection is bound to a view with the collection helper any events on the collection can be observed by the view in this way. For instance to observe any collection `reset` event when it is bound to any view:

    Thorax.View.on({
      collection: {
        reset: function() {

        }
      }
    });

## Thorax.View

### bindCollection *view.bindCollection(collection [, options])*

Binds any events declared via `view.on({collection: events})` including the built in `reset` and `error`, then attempts to fetch the collection if it has a URL and is not yet loaded. Accepts any of the following options:

- **render** - Wether to render the collection if it is populated, or render it after it has been loaded
- **fetch** - Wether or not to try to call `fetch` on the collection if `shouldFetch` returns true
- **success** - Callback on fetch success, defaults to noop
- **errors** - Wether or not to trigger an `error` event on the view when an `error` event is triggered on the collection

### unbindCollection *view.unbindCollection(collection [, options])*

Remove the event handlers bound by `bindCollection`

## Thorax.CollectionView

A `CollectionView` class is automatically generated each time a `collection` helper is used. A CollectionView may also be created in JavaScript and appended as a child view with the `view` helper. The constructor will accept any options that the `collection` helper accepts, though any template or view names must be the actual names and not inline templates. The `parent` attribute of the `CollectionView` is required in the constructor and is not automatically set for you as it would be when using the `collection` helper.

    var view = new Thorax.View({
      initialize: function() {
        this.myCollectionView = new Thorax.CollectionView({
          parent: this,
          "item-template": "item-template-name"
        });
        this.myCollectionView.setCollection(myCollection);
      },
      template: "{{view myCollectionView}}"
    });

### setCollection *view.setCollection(collection, options)*

If directly creating a CollectionView instance, the collection property may be set by passing `collection` to the constructor, or by calling this method. Accepts any options that the `bindCollection` method does.

### appendItem *view.appendItem(modelOrView [,index])*

Append a model (which will used to generate a new `item-view`) or a view at a given index in the `CollectionView`. If passing a view as the first argument `index` may be a model which will be used to look up the index.

### removeItem *view.removeItem(model)*

### updateItem *view.updateItem(model)*

## Thorax.Collection

### collection *Thorax.collection(name [,protoProps])*

Get or set a collection class.

### isEmpty *collection.isEmpty()*

Used by the `empty` helper and the `empty-template` and `empty-item` options of the `collection` helper to check wether a collection is empty. A collection is only treated as empty if it `isPopulated` and zero length.

### isPopulated *collection.isPopulated()*

Used by the `collection` helper to determine wether or not to fetch the collection.


## Extras

### $.collection *$(event.target).collection()*

Get a reference to the nearest bound collection. Can be used with any `$` object but most useful when dealing with event handlers.

    $(event.target).collection();

## Events

### rendered:collection *rendred:collection(collectionView, collection)*

Triggered on the view calling the `collection` helper every time `render` is called on the `CollectionView`.

### rendered:item *rendered:item(collectionView, collection, model, itemElement, index)*

Triggered on the view calling the `collection` helper every time an item is rendered in the `CollectionView`.

### rendered:empty *rendered:empty(collectionView, collection)*

Triggered on the view calling the `collection` helper every time the `empty-view` or `empty-template` is rendered in the `CollectionView`.
