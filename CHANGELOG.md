# Change Log

## 2.0

Thorax has been split into a variety of plugins for a better separation of concerns, the base thorax.js file now only deals with Backbone + Handlebars integration.

### Thorax Core Changes

- template has been renamed to renderTemplate
- templates may now be specified as part of the class definition as a string via the `template` attribute
- the preffered way to set a view is now Thorax.view(name, protoProps), rather than saying Application.Views.Name = klass; Set Application.Views = Thorax._views; for backwards compatibility
- the preffered way to set a template is now Thorax.template(name, templateStr) rather than Application.templates[name] = templateStr; Set Application.templates = Thorax._templates; for backwards compatibility
- Thorax.configure() has been removed and repalced with an Application class, the equivelent code would be:

    var Application = new Thorax.Application();
    Application.start(historyOptions);
    $('body').append(Application.el);

- scrollTo and scrollToTop have been removed and will appear in the mobile plugin in 2.1
- Handlebars.registerViewHelper has been added. `empty`, `collection` and other view helpers are all implemented in this manner
- addition of $.view, $.model and $.collection

### Mixin plugin

Mixin behaviors have been moved to the mixin plugin.

### Loading Plugin

All data loading functionality, including flushQueue, fetchQueue, bindToRoute and load() have been moved into a separate thorax.loading.js file. In addition the collection helper accepts two new arguments when this file is present:

- loading-view
- loading-template

Which insert a loading view or template onto the bottom of the collection while the collection is loading. A loading helper is also provided that can be used outside of the collection helper.

The signatures of exisiting methods were not changed and the unit tests for existing functionality were only trivially changed.

### Events Plugin

- Thorax.View.registerEvents has been renamed to Thorax.View.on and is available on all Backbone and Thorax classes
- Any object that can be used as the Thorax.View.prototype.events object may now be used as an argument to on()
- The nested event keyword has gone away and will re-appear (or have a different implementation accomplishing the same thing) in 2.1
- All view events regardless of how they are registered will now be processed with _addEvent who's signature is unchanged
- Events to be bound on another object only while the view is alive may be registered with: view.on(target, eventName, callback) When the view is destroyed the event on the target object will be unbound.

### Form plugin

`serialize`, `populate` and `validateInput` have been moved into a form plugin but are unchanged

### Helpers plugin

Added `link`, `url` and `button` helpers.

Previously all `click a` events would trigger the `Backbone.history.navigate` behavior. This is now opt in via the `link` helper.

### Collection Plugin

Collection handling has been completely re-written and is not backwards compatible. The new collection helper must be used. Multiple collections and multiple displays of the same collection may now be present in the same view. Each collection helper will generate a `CollectionView`instance. Specific migrations:

- item-context may be specified in the collection helper instead of setting an itemContext method on the view class
- empty-context may be specified in the collection helper instead of setting an emptyContext method on the view class
- rendered:collection event recieves the related collectionView as it's first argument
- rendered:item event recieves the related collectionView as it's first argument
- rendered:empty event recieves the related collectionView as it's first argument
- renderItem no longer exists on the view class, use the rendered:item event or specify specific behaviors in your item-view class
- renderEmpty no longer exists on the view class, use the rendered:empty event or specify specific behaviors in your empty-view class
- the filter option has been added which should be used in place of the behavior added in https://github.com/walmartlabs/thorax/pull/43/files

### Lumbar plugin

A lumbar plugin has been added which adds a module.router() method to each lumbar generated module. The Thorax + Lumbar node boilerplate project makes use of this:

https://github.com/walmartlabs/thorax-boilerplate/tree/master/thorax-node

### Model plugin

`Thorax.Model` and `setModel` have been moved to the model plugin but are unchanged in behavior.

### ViewController plugin

- `Thorax.Layout` has been renamed to `Thorax.LayoutView`. It is now a `Thorax.View` subclass instead of a `Backbone.View`. Multiple `LayoutView` instances may now be embedded in a parent view.
- `setView` has gained a `destroy: false` option
- `layout.getView()` must be used to get the current view of a layout instead of `layout.view`
- `Thorax.ViewController` and `Thorax.Application` classes have been added
- `route` and `route:before` events have been added to `Thorax.Router`

### Command line utilities

Have been removed, except for the following command:

    thorax templates ./templates-dir ./templates.js

Boilerplate projects have been provided and a lumbar.json editor will appear in 2.1

## 1.2

- load:start and load:end handling have been moved into a plugin
- nested event keyword now works with views, the callback will always be called with the context of the declaring view and will always recieve the triggering view as the first argument
- empty() the collection element before renderCollection()

## 1.1

- added {{collection}} helper
- _collectionSelector is now deprecated and internally defaults to [data-collection-cid], for backwards compatibility set it to ".collection" in your view classes
- added templatePathPrefix option to configure()
- unit tests!
- added nested event keyword
- added _addEvent method for subclasses to customize event registration
- registerEvents is now an instance method in addition to a class method
- added emptyContext method, called from renderEmpty
- checks for view.name property are now lazy
- exceptions are now thrown instead of using console.error
