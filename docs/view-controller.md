Thorax ViewController Plugin
============================

## Thorax.Router

A subclass of `Backbone.Router` that triggers `route` and `route:before` events when routes on the router are matched (Backbone provides a `route` event on `Backbone.History` but no way of determining which Router responded).

### router *Thorax.router(name [,protoProps])*

Get or set a router class.

## Thorax.LayoutView

A view to contain a single other view which will change over time, (multi-pane single page applications for instance), triggering a series of events . By default these classes have no template. If one is specified use the `layout` helper to determine where `setView` will place the view. A `Thorax.LayoutView` is a subclass of `Thorax.View` and may be treated as a view in every regard (i.e. embed multiple `LayoutView` instances in a parent view with the `view` helper).

### setView *view.setView(view [,options])*

Set the current view on the `LayoutView`, triggering `activated`, `ready` and `deactivated` events on the current and previous view during the lifecycle. See the [LayoutView example](http://jsfiddle.net/Y8AMu/) for an interactive example. `ensureRendered` is called on views passed to `setView`. By default `destroy` is called on the previous view when the new view is set. Pass `destroy: false` when setting a view to prevent it from being destroyed at a later time.

### getView *view.getView()*

Get the current view that was previous set with `setView`.

## Thorax.ViewController

A hybrid between a `Thorax.LayoutView` and `Thorax.Router`.

    var controller = new Thorax.ViewController({
      routes: {
        '': 'index'
      },
      index: function() {
        this.setView(new Thorax.View({
          template: 'Index page'
        }));
      }
    });
    $('body').append(controller.el);

### parent *viewController.parent*

If a parent is manually specified the view controller will set itself as the view on the parent with `parent.setView(this)` if it is not already the current view on the parent. This has the effect of allowing multiple routers that will automatically display themselves when they match a route.

    new Thorax.ViewController({
      parent: Application,
      ...
    });

Unlike calling `setView` on views, `ViewController` instances are never destroyed.

## View Helpers

### layout *{{layout [htmlAttributes]}}*

By default `Thorax.LayoutView`, `Thorax.ViewController` and `Thorax.Application` classes have no template, just a placeholder to insert a view via `setView`. If a template to any of those classes is specified it must contain the a call to the layout helper where views will be placed. A custom `tag` or any HTML attributes may be specified.

## Events

### route *route([args...])*

`Backbone.history` triggers a `route` event when any route is matched, where as this event is triggered on the object which matched the route.

### route:before *route:before(route, methodName [,args...])*

Triggered on the object which matched the route immediately before the matched `methodName` is called.

### change:view:start *change:view:start(newView [,oldView] ,options)*

Trigged on a `Thorax.LayoutView`, `Thorax.ViewController` or `Thorax.Application` immediately after `setView` is called.

### change:view:end *change:view:end(newView [,oldView] ,options)*

Trigged on a `Thorax.LayoutView`, `Thorax.ViewController` or `Thorax.Application` after `setView` is called, the old view has been destroyed (if present) and the new view has been attached to the DOM and had it's `ready` event triggered.

### activated *activated()*

Triggered on a view immediately after it was passed to `setView`

### ready *ready()*

Triggered on a view after it was passed to `setView` and the view's `el` is attached to the parent.

### deactivated *deactivated()*

Triggered on a view when `setView` was called with the next view and the current view's `el` is still attached to the parent.
