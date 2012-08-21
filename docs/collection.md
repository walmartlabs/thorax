Thorax Collection Plugin
========================

Adds view helpers and classes to support collection bindings in. See the [Todos example](http://jsfiddle.net/HAdxJ/) to see the collection plugin in action.

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
- `empty-context` - A function in the declaring view to specify the context that the empty-template is rendered with. If the view has an `emptyContext` function it will be used as the default.
- `loading-template` - Only available if the loading plugin has been included. A template to append when the collection is loading.
- `loading-view` - Only available if loading plugin has been included. A view to append when the collection is loading
- `filter` - A method on the view to filter which items are rendered. Recieves (model, index) and must return boolean.

Any of the options can be specified as variables in addition to strings:

    {{collection cats item-view=itemViewClass}}

`CollectionView` instances are created via a helper and not directly in a JavaScript API, so to get a reference to them you need to use the `helper:collection` event:

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
          //"this" will refer to the view
        }
      }
    });

The `collection` helper itself is implemented in this way.

## Thorax.CollectionView

A `Thorax.View` subclass generated each time a `collection` helper is used.

### appendItem *view.appendItem(modelOrView [,index])*

Append a model (which will used to generate a new `item-view`) or a view at a given index in the `CollectionView`. If passing a view as the first argument `index` may be a model which will be used to look up the index.

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
