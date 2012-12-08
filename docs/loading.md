Thorax Loading Plugin
=====================

Helpers and methods to load your data in an orderly manner.

TODO explanation of:
  - flushQueue
  - fetchQueue
  - resetQueue
  - nonBlockingLoad attribute
  - background option
  - ignoreErrors option

## Thorax.Util

### bindToRoute *Thorax.Util.bindToRoute(callback [,failback])*

Used by `model.load` and `collection.load`. Binds the callback to the current route. If the browser navigtates to another route in the time between when the callback is bound and when it is executed, callback will not be called. Else failback will be called if present.

    routerMethod: function() {
      var callback = Thorax.Util.bindToRoute(function() {
        //callback called if browser is still on route
      });
      setTimeout(callback, 5000);
    }

## Thorax.Model & Collection

When the loading plugin is used both `fetch` and `load` on a `Thorax.Model` or `Thorax.Collection` will trigger `load:start` and `load:end` events. Pass `background: true` as an option to either method to prevent the event from being triggered on the `rootObject`.

### load *object.load(callback [,failback] [,options])*

Calls `fetch` on the model or collection ensuring the callbacks will only be called if the route does not change.`callback` and `failback` will be used as arguments to `bindToRoute`. `options` will be passed to the `fetch` call on the model or collection if present.

    routerMethod: function(id) {
      var view = new (Application.view("view/name"));
      var model = new Application.Model({id: id});
      model.load(function() {
        //callback only called if browser still on this route
        view.setModel(model);
        Application.layout.setView(view);
      }, function() {
        //failback only called if browser has left this route
      });
    }

## Thorax

### loadHandler *Thorax.loadHandler(startCallback, endCallback)*

Generates an `load:start` event handler that when triggered will then monitor the associated object for a `load:end` event. If the duration between the start and and the end events exceed `_loadingTimeoutDuration` then the `start` and `end` callbacks will be triggered at the appropriate times to allow the display of a loading UI.

    Application.on("load:start", Thorax.loadHandler(
      function(message, background, object) {
        Application.$el.addClass("loading");
      },
      function(background, object) {
        Application.$el.removeClass("loading");
      }));

### setRootObject *Thorax.setRootObject(obj)*

Set the root object that will recieve `load:start` and `load:end` events if the `load:start` was not a `background` event. If creating a new `Thorax.Application` the Application object will automatically set itself as the root object.

## Events

### load:start *load:start(message, background, target)*

Triggered by `fetch` or `load` in a `Thorax.Model` or `Thorax.Collection`.

### load:end *load:end(target)*

Triggered by `fetch` or `load` in a `Thorax.Model` or `Thorax.Collection`. Never observe this directly, always use `Thorax.loadHandler` on `load:start`.

## Thorax.View

### _loadingClassName *view._loadingClassName*

Class name to add and remove from a view's `el` when it is loading. Defaults to `loading`.

### _loadingTimeoutDuration *view._loadingTimeoutDuration*

Timeout duration in seconds before a `load:start` callback will be triggered. Defaults to 0.33 seconds. If for instance the `load:end` event was triggered 0.32 seconds after the `load:start` event the `load:start` callback would not be called.

### _loadingTimeoutEndDuration *view._loadingTimeoutEndDuration*

Just like `_loadingTimeoutDuration` but applies to `load:end`. Defaults to 0.10 seconds.

## View Helpers

### loading *{{#loading}}*

A block helper to use when the view is loading. For collection specific loading the `collection` helper accepts `loading-view` and `loading-template` options to append an item in a collection when it is loading.

    {{#loading}}
      View is loading a model or collection.
    {{else}}
      View is not loading a model or collection.
    {{/loading}}


