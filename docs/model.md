Thorax Model Plugin
===================

Adds model binding to Thorax.View and necessary support methods to Thorax.Model.

## Thorax.Model

### model *Thorax.model(name [,protoProps])*

Get or set a model class.

### isEmpty *model.isEmpty()*

Used by the `empty` helper. In a collection the implementations of `isEmpty` and `isPopulated` differ, but in a model `isEmpty` is an alias for `isPopulated`.

### isPopulated *model.isPopulated()*

Used by `setModel` to determine wether or not to fetch the model. The default implementation checks to see if any keys that are not `id` and are not default values have been set.

## View Events

The model plugin extends the events plugin by allowing a `model` hash of events to be specified in the View `events` object or to a view's `on` method. When a model is bound to a view with `setModel` any events on the model can be observed by the view in this way. For instance to observe any model `change` event when it is bound to any view:

    Thorax.View.on({
      model: {
        change: function() {
          //"this" will refer to the view
        }
      }
    });

## Thorax.View

### context *view.context()*

Changes the default context available to a view to be `this` + `model.attributes` instead of just `this`.

### setModel *view.setModel(model [,options])*

Set the `model` attribute of a view, triggering certain behaviors based on the options passed. Setting `model` in the construtor will automatically call `setModel`. When a model is set it will be fetched by default if it needs to be, re-rendering the view when it has succeeded. Available options:

- **fetch** - Boolean, wether to fetch the model when it is set, defaults to true.
- **success** - Callback on fetch success, defaults to noop
- **render** - Render on the view on model:change? Defaults to true
- **populate** - Call `populate` with the model's attributes when it is set? Defaults to true
- **errors** - When the model triggers an `error` event, trigger the event on the view? Defaults to true

The following are equivelent:

    var view = new Thorax.View({
      model: myModel
    });
    view.setModel(myModel);

## $

### $.model *$(event.target).model()*

Get a reference to the nearest bound model.

    $(event.target).model()