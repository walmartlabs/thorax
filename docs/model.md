Thorax Model Plugin
===================

Adds model binding to Thorax.View and necessary support methods to Thorax.Model, but does not implement any significant model or sync functionality.

## Thorax.Model

### model *Thorax.model(name [,protoProps])*

Get or set a model class.

### isEmpty *model.isEmpty()*

Used by the `empty` helper. In a collection the implementations of `isEmpty` and `isPopulated` differ, but in a model `isEmpty` is an alias for `isPopulated`.

### isPopulated *model.isPopulated()*

Used by `setModel` to determine wether or not to fetch the model. The default implementation checks to see if any keys that are not `id` and are not default values have been set.

## Thorax.View

### context *view.context()*

Changes the default context available to a view to be `this` + `model.attributes` instead of just `this`.

### bindModel *view.bindModel(model [,options])*

Binds any events declared via `view.on({model: events})` including the built in `change` and `error`, then attempts to fetch the model if it has not yet been populated. Accepts any of the following options:

- **fetch** - Boolean, wether to fetch the model when it is set, defaults to true.
- **success** - Callback on fetch success, defaults to noop
- **render** - Render on the view on model:change? Defaults to true
- **populate** - Call `populate` with the model's attributes when it is set? Defaults to true. Pass `populate: {children: false}` to prevent child views from having their inputs populated.
- **errors** - When the model triggers an `error` event, trigger the event on the view? Defaults to true

### unbindModel *view.unbindModel(model)*

Unbind the model events bound bind `bindModel`.

### setModel *view.setModel(model [,options])*

Set the `model` attribute of a view, then bind it via `bindModel` with the passed options. In addition to the behaviors in `bindModel` the default `context` of a view includes `this.model.attributes`, so the model's attributes will become available in the template. Setting `model` in the construtor will automatically call `setModel`, so the following are equivelent:

    var view = new Thorax.View({
      model: myModel
    });
    view.setModel(myModel);