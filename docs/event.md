Thorax Event Plugin
===================
Adds inheritable class events for all Backbone and Thorax classes and significant enhancements to the Thorax.View event handling. 

## Class Methods

### on *klass.on(eventName, callback)*

Allows all Backbone and Thorax classes to observe events on all instances of the class. Subclasses inherit their parents' event handlers. Optionally an object may be passed containing `eventName` `callback` pairs.

    Backbone.Model.on('change', function() {
      //"this" will refer to the model
      //that triggered the event
    });

    Thorax.View.on({
      'click a': function(event) {

      }
    });

## Instance Methods

Applies only to Thorax.View and subclasses.

### freeze *view.freeze([options])*

`off` all view event handlers, DOM event handlers and call `freeze` on any child views. Pass `dom: false` to only `off` view events, or `children: false` to prevent `freeze` from being called on child views. Triggers the `freeze` event.

### _addEvent *view._addEvent(eventParams)*

This method is never called directly, but can be specified to override the behavior of the `events` hash or any event arguments passed to `on`. For each event declared in either manner `_addEvent` will be called with a hash containing:

- type "view" || "DOM"
- name (DOM events will begin with ".delegateEvents")
- originalName
- selector (DOM events only)
- handler

## Event Enhancements

Applies only to Thorax.View and subclasses.

### Events Object *view.events*

The `Backbone events` object now accepts view events in addition to DOM events. In addition any object that can be set as the events object may also be passed to the `on` method.

    new Thorax.View({
      events: {
        'click a': function() {},
        rendered: function() {}
      }
    })

### DOM Events *view.on(eventNameAndSelector, callback [,context])*

The `on` method will now accept event strings in the same format as the events hash, for instance `click a`. Events separated by a space will still be treated as registering multiple events so long as the event name does not start with a DOM event name (`click`, `change`, `mousedown` etc).

DOM events observed in this way will only operate on the view itself. If the view embeds other views with the `view` helper that would match the event name and selector, they will be ignored. For instance declaring:

    view.on('click a', function(event) {})

Will only listen for clicks on `a` elements within the view. If the view has children that has `a` elements, this handler will not observe clicks on them.

DOM events may be prefixed with the special keyword `nested` which will apply the event to all elements in child views:

    view.on('nested click a', function() {})

Thorax will add an attribute to the event named `originalContext` that will be the `Element` object that would have been set as `this` had the handler been registered with jQuery / Zepto:

    $('a').on('click', function() {});
    view.on('click a', function(event) {
      // event.originalContext === what "this" would be in the
      // first handler
    });

## Events

### freeze *freeze*

Triggered when the `freeze` method is called (either directly or via `destroy`). No arguments are passed.