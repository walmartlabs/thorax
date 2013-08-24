# Thorax

An opinionated, battle tested [Backbone](http://backbonejs.org/) + [Handlebars](http://handlebarsjs.com/) framework to build large scale web applications.



# Getting Started


### 1
- `npm install yo`
- `npm install thorax`
- `yo thorax`

### 2

Open the seed project in your favorite text editor. Things to know before we get started: 

* You must use the seed project to build with thorax
* Most of the dependencies are build related. This is a mobile framework: very little goes over the wire.

## picture of directory structure

* *components*, are front end packages managed by [bower](http://bower.io/), see *bower.json*
* *js*, is where you'll spend most your development time - your models, collections, views and routers live here.
* *node modules* are dependencies managed by [npm](https://npmjs.org/)
* *public* is the folder the project files are copied into during the build process - all that goes over the wire. Notice in particular that there is hardly anything in the index file - it should stay like this except for script tags you'll need to put into the head (like a script tag from [typekit](http://help.typekit.com/customer/portal/articles/649336-embed-code), for instance, or other packages you're grabbing from a [cdn](http://cdnjs.com)). 
* you can have as many different *.css* files in the *stylesheets* folder as you want, and 
* *tasks* is grunt
* *templates* contains all of your *.handlebars* files. Your HTML and handlebars logic will live here, not in your index.html file.
  * *application.handlebars* will contain headers and footers, as well as [layout elements]
* *.json* files are config for build & dependencies 

### 3

Here are three tutorials of increasing complexity that have been designed to help you learn to build single page applications with Thorax. 

1. A very small contact list tutorial. [demo](). The goal: 
  * demonstrate the major concepts in building a thorax app: models, collections, routers, views and templates. Demonstrate how they interact
  * implement CRUD via backbone.localStorage
2. Alex Osterwalder's Business Model Canvas implemented in Thorax. [demo]() The goal: 
  * demonstrate more complex views, ui patterns, Twitter Bootstrap (ie., pagination with collection rendering, showing child views inside of tabs, etc.) also done with local storage
3. A fully featured Thorax application called 10-4, with a Ruby on Rails backend. Developed internally for employee monitoring & feedback at Walmart and subsequently open sourced. This tutorial is heavier on discussions of application architecture and lighter on step by step instructions.


### [go to api call to action](api.html)
### [start first tutorial psuedo call to action](first_tutorial.htlm)









# API Reference


## REQUIRE JS

SECTION NARRATIVE: Modules! Hit them from the router which is really just backbone.router.extend!


## MODELS & COLLECTIONS

SECTION NARRATIVE: Backbone's models and collections are nearly unchanged. Thorax enhances `Backbone.Model` and `Backbone.Collection` with the concept of whether or not the model or collection is populated and whether or not it should be automatically fetched. Note that when passing a model or collection to `view.setModel` or `view.setCollection` it must be an instance of `Thorax.Model` or `Thorax.Collection` and not `Backbone.Model` or `Backbone.Collection`, respectively.

### *model.isEmpty()* *collection.isEmpty()*

NARRATIVE: You will likely not need to call this method directly. It will normally be called by the template helper `{{#empty modelOrCollection}}` or `CollectionView`. 

API: In a collection the implementations of `isEmpty` and `isPopulated` differ, but in a model `isEmpty` is an alias for `!isPopulated`. For collections, `isEmpty()` is used by the `empty` helper and the `emptyTemplate` and `emptyItem` options of a `CollectionView` to check whether a collection is empty. A collection is only treated as empty if it `isPopulated` and zero length. <-- this last sentence seems wonky...

<a class="jsbin-embed" href="http://jsbin.com/afejoq/3/embed?live">JS Bin</a><script src="http://static.jsbin.com/js/embed.js"></script>

### *model.isPopulated()* *collection.isPopulated()*

NARRATIVE: When you add a model attribute to a view, `setModel` is going to be called on that view for you automatically by Thorax. `view.setModel()` and `view.setCollection()` use this to determine whether or not to fetch the collection.

API: The default implementation checks to see if any keys that are not `id` and are not default values have been set.

<a class="jsbin-embed" href="http://jsbin.com/afejoq/3/embed?live">JS Bin</a><script src="http://static.jsbin.com/js/embed.js"></script>








## Thorax.View

SECTION NARRATIVE: Backbone doesn't give you much in the way of collection rendering. By associating a model or collection with a view instance and associating a template with the view, you gain access to the properties of the models within the collection in the template. This is the core of the functionality Thorax offers, and some of the hairiest stuff to write yourself.


SECTION API (details): `Thorax.View` provides additive functionality over `Backbone.View` but breaks compatibility in one imporant way in that it does not use an `options` object. All properties passed to the view when it is instantiated become available on the view instance:

    var view = new Thorax.View({
      key: "value"
    });
    view.key === "value"

By default all instance properties are available in the template context. So when setting a key on the view it will by default be available in the template.


### template *view.template*

NARRATIVE: Assign a template to a view. Usually, you won't do this manually. If the view has a `name` and a template of the same `name` is available the `template` will be auto-assigned. For instance:

    Thorax.View.extend({
      name: "fooView"
    })

will automatically use fooView.handlebars as its template.

API: If you do need to set it manually, you can assign the template property a string, or assign it a function which recieves a reference to a property of the model in the current `context`. 

    new Thorax.View({
      template: Handlebars.compile("{{key}}")
    });


### context *view.context()*

NARRATIVE: `view.context` can be used to manually set the context for the current view. Usually, you won't do this manually - `view.context()` is used by `render` to determine what attributes are available in the view's `template`. `render` is in turn usually called by `Application.setView()`, which is in turn called in the `router` when the user hits a new route.[Handlebars requires a 'context object'](http://handlebarsjs.com/execution.html), a JavaScript object passed into a handlebars function. Handlebars then gives you access to the properties on this object in your template. By default, the context function returns `this` + `this.model.attributes` if a `model` is present on the view, for instance:

    var fooView1 = new Thorax.View({
      model: fooModel1
    })

In other words, Thorax usually handles context for you. It gives you access to the properties of the view's model (or when you use the `{{#collection}} block helper, the properties of all the models in a view's collection) just by assigning a model (or collection) to the view. Nice.

API: The `context` method may be overriden to provide a custom context:

    new Thorax.View({
      template: Handlebars.compile('{{key}}'),
      context: function() {
        return _.defaults(this.model.attributes, {
          key: 'value'
        });
      }
    });


### render *view.render([content])*

NARRATIVE: Renders the view's `template` updating the view's `el` with the result, triggering the `rendered` event.

    view.render();

Usually, you will not call this manually but will call Application.setView(fooViewInstance) in the router, passing in a view instance. 

API: `render` can also accept a content argument that may be an element, string or a template function:

    view.render('custom html');


### ensureRendered *view.ensureRendered()*

NARRATIVE: Ensure that the view has been rendered at least once. Used when calling render manually.


### appendTo *view.appendTo(element)*

NARRATIVE: Appends the view to a given `element` which may be a CSS selector or DOM element. `ensureRendered` will be called and a `ready` event will be triggered. This is the preferred way to append your outer most view onto a page.

### children *view.children*

NARRATIVE: An array of child views indexed by [`cid`](http://backbonejs.org/#Model-cid). Child views may become attached to the parent with the `view` helper:

    {{view fooView}}

or may be automatically attached `HelperView` instances created by helpers created with `regsterViewHelper` (such as the `collection` and `empty` helpers).

### parent *view.parent*

NARRATIVE: If a view was embedded inside another with the `{{view fooView}}` Handlebars helper, or a generated `HelperView` (for instance the `collection` or `empty` helpers) it will have a `parent` view attribute. In the case of `HelperView`s, the `parent` will be the view that declared the helper in its template.

### retain *view.retain([owner])*

Prevents a view from being destroyed if it would otherwise be. If a parent is destroyed all it's children will be destroyed, or if it was previously passed to `setView`

Given the code below:

    a.retain();
    Application.setView(a);
    Application.setView(b);
    Application.setView(c);

`b` will be destroyed, and `a` will not be.

When the optional `owner` parameter is passed, the retain reference count will automatically be reduced when the owner view is destroyed.

### release *view.release()*

Narrative: Release a view that was previously retained. Generally, this method is not needed unless you are `retain`ing views. `release` is usally called automatically if a view was attached to a `LayoutView` with the `setView` method, and another view is then passed to `setView`.

API: If `release` is called and the view has a reference count of zero it will be destroyed, which will release all children, remove all events, unbind all models and collections, call `remove` and trigger the `destroyed` event.




### setModel *view.setModel(model [,options])*

NARRATIVE: Setting `model` as an option when the view is instantiated will automatically call `setModel`, so the following are equivelent:

    var view = new Thorax.View({
      model: myModel
    });
    // identical functionality as above
    view.setModel(myModel);

API: Sets the `model` attribute of a view then attempts to fetch the model if it has not yet been populated. Once set the default `context` implementation will merge the model's `attributes` into the context, so any model attributes will automatically become available in a template. In addition any events declared via `view.on({model: events})` will be bound to the model with `listenTo`.

Accepts any of the following options:

- **fetch** - Boolean, whether to fetch the model when it is set, defaults to true.
- **success** - Callback on fetch success, defaults to noop
- **render** - Render on the view on model:change? Defaults to undefined
  - `true` : Always render on change
  - `false` : Never render on change
  - `undefined` : Rerender if we have already been rendered
- **populate** - Call `populate` with the model's attributes when it is set? Defaults to true.
  - Pass `populate: {children: false}` to prevent child views from having their inputs populated.
  - Pass `populate: {context: true}` to populate using using the view's context rather than directly populating from the model's attributes.
- **errors** - When the model triggers an `error` event, trigger the event on the view? Defaults to true






### setCollection *view.setCollection(collection [,options])*

NARRATIVE: Setting `collection` in the construtor will automatically call `setCollection`, so the following are equivelent:

    var view = new Thorax.View({
      collection: myCollection
    });
    // identical functionality as above
    view.setCollection(myCollection);

API: Sets the `collection` attribute of a view then attempts to fetch the collection if it has not yet been populated. In addition any events declared via `view.on({collection: events})` will be bound to the collection with `listenTo`.

Accepts any of the following options:

- **render** - Whether to render the collection if it is populated, or render it after it has been loadedundefined
  - `true` : Always render on change
  - `false` : Never render on change
  - `undefined` : Rerender if we have already been rendered
- **fetch** - Whether or not to try to call `fetch` on the collection if `shouldFetch` returns true
- **success** - Callback on fetch success, defaults to noop
- **errors** - Whether or not to trigger an `error` event on the view when an `error` event is triggered on the collection

Note that while any view may bind a collection only a `CollectionView` will actually render a collection. A regular `Thorax.View` may declare a `collection` helper which in turn will generate and embed a `CollectionView`.

### $.view *$(event.target).view([options])*

NARRATIVE: Get a reference to the nearest parent view. 

API: Pass `helper: false` to options to exclude `HelperView`s from the lookup. Useful when registering DOM event handlers:

    $(event.target).view();

### $.model *$(event.target).model([view])*

NARRATIVE: Get a reference to the nearest bound model. `$.model` is very helpful if you need to get a reference to the model associated with a DOM element rendered by a `{{collection}}` helper. Maybe you've rendered a list of 15 items and a user clicked on the third one. Grab that model! If the model is set directly as a property on the view when it is instantied (rather than in the context of a collection), use `this.model` to get a reference to it. 

API: Can be used with any `$` object but most useful in event handlers:

    $(event.target).model();

A `view` may be optionally passed to limit the lookup to a specific view. Returns the entire model object, so all properties are available.







## TEMPLATES

In templating, data recieved by the client from the server makes it into the DOM. While Backbone uses Underscore's built in templates, Thorax uses [Handlebars](http://handlebarsjs.com/). The client makes a request to a url (Backbone uses `$.ajax()`) and (should) receive JSON in the response. This JSON populates a model, which is associated with a view (because `model` or `collection` is specified on the view instance). The view is in turn associated with a template. The beautiful part is that Thorax gives you access to model properties inside of your template automatically:

    Hello {{name}}!
    Your trial will expire in {{daysLeft}} days.

...where `{{name}}` and `{{daysLeft}}` is a property of a `model` that is associated with the template's `view`. 

Additionally, custom Handlebars templates allow you to seamlessly embed views inside of one another with `{{view}}`, trigger a method or event on the corresponding view when a button is clicked with `{{#button}}`, render a collection with `{{#collection}}` and trigger a REST route when a link is clicked on with `{{link}}`.


### view *{{view name [options]}}*

NARRATIVE: Embed one view in another. If you don't put the argument `{{view fooArgument}}` in quotes, Thorax will look for an instance of this view on the view responsible for the current template's view. If you do put `{{view "fooArgument"}}` in quotes, Thorax will look for a class with name `fooArgument` and instantiate it.

API: The first argument may be the name of a new view to initialize or a reference to a view that has already been initialized.

    {{view "path/to/view" key="value"}}
    {{view viewInstance}}

If a block is specified it will be assigned as the `template` to the view instance:

    {{#view viewInstance}}
      viewInstance will have this block
      set as its template property
    {{/view}}

### collection *{{collection [collection] [options...]}}*

NARRATIVE: Creates and embeds a `CollectionView` instance, updating when items are added, removed or changed in the collection. 

API: If a block is passed it will be used as the `item-template`, which will be called with a context of the `model.attributes` for each model in the collection.

    {{#collection tag="ul"}}
      <li>{{modelAttr}}</li>
    {{/collection}}

Options may contain `tag`, `class`, `id` and the following attributes which will map to the generated `CollectionView` instance:

- `item-template` &rarr; `itemTemplate`
- `item-view` &rarr; `itemView`
- `empty-template` &rarr; `emptyTemplate`
- `empty-view` &rarr; `emptyView`
- `loading-template` &rarr; `loadingTemplate`
- `loading-view` &rarr; `loadingView`
- `item-context` &rarr; `itemContext`
- `item-filter` &rarr; `itemFilter`

Any of the options can be specified as variables in addition to strings:

    {{collection item-view=itemViewClass}}

By default the collection helper will look for `this.collection`, but if your view contains multiple collections a collection argument may be passed:

    {{collection myCollection}}

When rendering `this.collection` many properties will be forwarded from the view that is declaring the collection helper to the generated `CollectionView` instance:

- `itemTemplate`
- `itemView`
- `itemContext`
- `itemFilter`
- `emptyTemplate`
- `emptyView`
- `loadingTemplate`
- `loadingView`
- `loadingPlacement`

As a result the following two views are equivelenet:

    // render with collection helper, collection
    // properties are forwarded
    var view = new Thorax.View({
      collection: new Thorax.Collection(),
      itemView: MyItemClass,
      itemContext: function(model, i) {
        return model.attributes;
      },
      template: Handlebars.compile('{{collection}}')
    });

    // directly create collection view, no property
    // forwarding will occur
    var view = new Thorax.View({
      collectionView: new Thorax.CollectionView({
        collection: new Thorax.Collection(),
        itemView: MyItemClass
        itemContext: function(model, i) {
          return model.attributes;
        }
      }),
      template: Handlebars.compile('{{view collectionView}}')
    });

### button *{{#button methodName [htmlAttributes...]}}*

NARRATIVE: Creates a `button` tag that will call the specified methodName on the view when clicked. Arbitrary HTML attributes can also be specified.

    {{#button "fooMethodName" class="btn" type="button"}}Click Me{{/button}}

And in the template's view class: 

    Thorax.View.extend({
      ...
      fooMethodName: function(){
        console.log('You just clicked a button that triggered a method on a view :)')
      }
      ...
    })

API: The tag name may also be specified:

    {{#button "methodName" tag="a" class="btn"}}A Link{{/button}}

A `trigger` attribute will trigger an event on the declaring view:

    {{#button trigger="eventName"}}Button{{/button}}

A button can have both a `trigger` attribute and a method to call:

    {{#button "methodName" trigger="eventName"}}Button{{/button}}

The method may also be specified as a `method` attribute:

    {{#button method="methodName"}}Button{{/button}}

### link *{{#link url [htmlAttributes...]}}*

NARRATIVE: Creates an `a` tag that will call `Backbone.history.navigate()` with the given url when clicked. Passes the `url` parameter to the `url` helper with the current context. Do not use this method for creating links that navigate outside of the single page application - only those that hit routes that call methods on the router. 

API: Like the `url` helper, multiple arguments may be passed as well as an `expand-tokens` option.

    {{#link "articles/{{id}}" expand-tokens=true class="article-link"}}Link Text{{/link}}

To call a method from an `a` tag use the `button` helper:

    {{#button "methodName" tag="a"}}My Link{{/button}}

Like the `button` helper, a `trigger` attribute may be specified that will trigger an event on the delcaring view in addition to navigating to the specified url:

    {{#link "articles" id trigger="customEvent"}}Link Text{{/link}}

The href attribute is required but may also be specified as an attribute:

    {{#link href="articles/{{id}}" expand-tokens=true}}Link Test{{/link}}

### empty *{{#empty [modelOrCollection]}}*

NARRATIVE: A conditional helper much like `if` that calls `isEmpty` on the specified object. 

API: `{{empty}}` will bind events to re-render the view should the object's state change from empty to not empty, or visa versa.

    {{#empty collection}}
      So empty!
    {{else}}
      {{#collection}}{{/collection}}
    {{/empty}}

To embed a row within a `collection` helper if it the collection is empty, specify an `empty-view` or `empty-template`. Or use the `else` block of the `collection` helper:

    {{#collection tag="ul"}}
      <li>Some very fine data</li>
    {{else}}
      <li>So very empty</li>
    {{/collection}}

### template *{{template name [options]}}*

Narrative: Embed a template inside of another, as a string. An associated view (if any) will not be initialized. 

API: By default the template will be called with the current context but extra options may be passed which will be added to the context.

    {{template "path/to/template" key="value"}}

If a block is used, the template will have a variable named `@yield` available that will contain the contents of the block.

    {{#template "child"}}
      content in the block will be available in a variable
      named "@yield" inside the template "child"
    {{/template}}

This is useful when a child template will be called from multiple different parents.




## Thorax.HelperView

SECTION NARRATIVE: All of the above template helpers (refered to in the docs as `HelperView`s) were written using (`Handlebars.registerHelper`)[http://handlebarsjs.com/#helpers] . You can create your own as well.

### registerViewHelper *Handlebars.registerViewHelper(name [,viewClass] ,callback)*

NARRATIVE: `Handlebars.registerViewHelper()` registers a helper templates that will create and append a new `HelperView` instance, with its `template` attribute set to the value of the code within the template block. A `HelperView` instance differs from a regular view instance in that it has a `parent` attribute which is always set to the declaring view, and a `context` which always returns the value of the `parent`'s context method. The `collection`, `empty` and other built in block view helpers are created with `registerViewHelper`. Note that this differs from `Handlebars.registerHelper`.

    {{#aBeautifulHelperView arg1 arg2}}

      <p> I'm text captured in the block and set as the template attribute on the associated helper view, you'll find that my ..aaaagghhhh... </p>

    {{/aBeautifulHelperView}}

API: `callback` will recieve any arguments - arg1 & arg2 above - passed to the helper followed by a `HelperView` instance. Named arguments to the helper will be present on `options` attribute of the `HelperView` instance.

A helper that re-rendered a `HelperView` every time an event was triggered on the declaring view could be implemented as:

    Handlebars.registerViewHelper('on', function(eventName, helperView) {
      helperView.listenTo(helperView.parent, eventName, function() {
        helperView.render();
      });
    });

An example use of this would be to have a counter that would increment each time a button was clicked. In Handlebars:

    {{#on "incremented"}}{{i}}{/on}}
    {{#button trigger="incremented"}}Add{{/button}}

And the corresponding view class:

    new Thorax.View({
      events: {
        incremented: function() {
          ++this.i;
        }
      },
      initialize: function() {
        this.i = 0;
      },
      template: ...
    });

In addition, if a view class is specified as the second argument to `registerViewHelper`, the helper will always initialize a view of that class instead of a `HelperView`:

    Handlebars.registerViewHelper('collection',
      Thorax.CollectionHelperView, function(collection, view) {

    });








## Thorax.CollectionView

NARRATIVE: Usually, `Thorax.Collectionview` will be called for you when you use the Handlebars collection block helper: {{#collection theNameOfACollection}}. If you need manual control, use these view methods.

API: `Thorax.CollectionView` is a class that renders an `itemTemplate` or `itemView` for each item in a `collection` passed to it when it is instantiated, or via `setCollection`. The view will automatically update when items are added, removed or changed. The `collection` helper will automatically create and embed a `CollectionView` instance for you. If programatic access to the view's methods are needed (for instance calling `appendItem` or specifying an `itemFilter`) it's best to create a `CollectionView` directly and embed it with the `view` helper as you would any other view.

### itemView *view.itemView*

NARRATIVE: A view class to be initialized for each item in a collection. When rendering collection views in either straight Backbone or Thorax, you'll need to create a view for each model in the collection: there is a one to one correspondence between views and models. There is also, in Thorax, the need to create a template for each view, thus `itemView` can be used in conjunction with `itemTemplate`.

### itemTemplate *view.itemTemplate*

NARRATIVE: A template name or template function to use when rendering each model. 

API: If using the `collection` helper the passed block will become the `itemTemplate`. Defaults to `view.name + '-item'`


### itemContext *view.itemContext(model, index)*

NARRATIVE: A function in the declaring view to specify the context for an `itemTemplate`. 

API: `itemContext` recieves model and index as arguments. `itemContext` will not be used if an `itemView` is specified as the `itemView`'s own `context` method will instead be used.

A collection helper may specify a specific function to use as the `itemContext` if there are multiple collections in a view:

    {{#collection todos item-context="todosItemContext"}}

### itemFilter *view.itemFilter(model, index)*

NARRATIVE: Filtering is a common user interface pattern in single page applications. In Thorax, use `itemFilter` as a method on the view: 

    Thorax.View.extend({
      name: "baz",
      initialize: function(){
        ...
      },
      itemFilter: function(model, index) {
        if (model.foo === "bar") { return false; }
        else if (...) { return false; }
        else { return true; }
      }
    })

When the `{{#collection}}` block helper is called in the template and iterates over the models to render them, each of the models will be evaluated and rendered only if it returns `true`.

API: Recieves `model` and `index` and must return boolean. The filter will be applied when models' fire a change event, or models are added and removed from the collection. To force a collection to re-filter, trigger a `filter` event on the collection.

Items are hidden and shown with `$.hide` and `$.show` rather than being removed or appended. In performance critical views with large collections consider filtering the collection before it is passed to the view or on the server.

A collection helper may specify a specific function to use as the `itemFilter` if there are multiple collections in a view:

    {{#collection todos item-filter="todosItemFilter"}}

### emptyTemplate *view.emptyTemplate*

NARRATIVE: A template name or template function to display when the collection is empty. 

API: If used in a `collection` helper the inverse block will become the `emptyTemplate`. Defaults to `view.name + '-empty'`

### emptyView *view.emptyView*

NARRATIVE: A view class to create an instance of when the collection is empty. Can be used in conjunction with `emptyTemplate`. Empty view exists because empty templates can be complex - for instance, an empty cart may have a collection of suggested products in it. 

### appendItem *view.appendItem(modelOrView [,index] [,options])*

NARRATIVE: Append a model (which will used to generate a new `itemView` or render an `itemTemplate`) or a view at a given index in the `CollectionView`. 

API: If passing a view as the first argument `index` may be a model which will be used to look up the index.

By default this will trigger a `rendered:item` event, `silent: true` may be passed in the options hash to prevent this. To also prevent the appeneded item from being filtered if an `itemFilter` is present pass `filter: false` in the options hash.

### removeItem *view.removeItem(model)*

NARRATIVE: Remove an item from the view.

### updateItem *view.updateItem(model)*

NARRATIVE: Meant to cover edge cases, by default changing a model will update the needed item (whether using `itemTemplate` or `itemView`).

API: Equivelent to calling `removeItem` then `appendItem`. 










## Page Layout in Thorax

In any given single page application, you may have different persistent content areas that will update and change independently - think of a sidebar and a main area (the persistent header and footer are typically taken care of in the application.handlebars file). There are a number of important things to understand about layouts. The first is that there's a default. By default, in application.handlebars, there is a single {{layout-element}} that will be nuked each time you call setView from your router, and the view's associated template will be put in its place. 

If you want manual control, you ... INSERT NARRATIVE HERE.


## Thorax.LayoutView

A view to contain a single other view which will change over time, (multi-pane single page applications for instance), triggering a series of events . By default this class has no template. If one is specified use the `layout` helper to determine where `setView` will place a view. A `Thorax.LayoutView` is a subclass of `Thorax.View` and may be treated as a view in every regard (i.e. embed multiple `LayoutView` instances in a parent view with the `view` helper).

### setView *view.setView(view [,options])*

Set the current view on the `LayoutView`, triggering `activated`, `ready` and `deactivated` events on the current and previous view during the lifecycle. `ensureRendered` is called on views passed to `setView`. By default `destroy` is called on the previous view when the new view is set.

### getView *view.getView()*

Get the current view that was previously set with `setView`.


## Working with a layout element

when you aren't using a layout view, you'll want to make sure you haven't rendered too many times. if you are using a layout view, render is called for you. you will almost always just call setView and have render called for you, but if you need fine grained control here it is: 







## Form handling in Thorax

Narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative narrative.



### serialize *view.serialize([event], callback [,options])*

Serializes a form. `callback` will receive the attributes from the form, followed by a `release` method which must be called before the form can be submitted again. `callback` will only be called if `validateInput` returns nothing or an empty array. `options` may contain:

- `set` - defaults to true, whether or not to set the attributes if valid on a model if one was set with `setModel`
- `validate - defaults to true, whether or not to call `validateInput` during serialization
- `children` - defaults to true, whether or not to serialize inputs in child views
- `silent` - defaults to true, whether or not to pass `silent: true` to `model.set`

Each form input in your application should contain a corresponding label. Since you may want to re-use the same form multiple times in the same view a `@cid` attribute with a unique value is provided to each render call of each template:

    <label for="{{@cid}}-last-name"/>
    <input name="last-name" id="{{@cid}}-last-name" value="Beastridge"/>
    <label for="{{@cid}}-address[street]"/>
    <input name="address[street]" value="123 Chestnut" id="{{@cid}}-address[street]"/>

    new Thorax.View({
      events: {
        "submit form": function(event) {
          this.serialize(event, function(attributes, release) {
            attributes["last-name"] === "Beastridge";
            attributes.address.street === "123 Chestnut";
            //form is locked to prevent duplicate submission
            //until release is called
            release();
          });
        }
      }
    });

`serialize` Triggers the following events:

- `serialize` - called before validation with serialized attributes
- `validate` - with an attributes hash and errors array after `validateInput` is called
- `error` - with an errors array, if validateInput returned an array with any errors
- `root` - the root element to serialize within, defaults to `this.$el`

If your view uses inputs with non standard names (or no names, multiple inputs with the same name, etc), use the `serialize` event:

    this.on('serialize', _.bind(function(attributes) {
      attributes.custom = this.$('.my-input').val();
    }, this));

### populate *view.populate([attributes] [,options])*

Populate the form fields in the view with the given attributes. The keys of the attributes should correspond to the names of the inputs. `populate` is automatically called with the response from `view.context()` when `setModel` is called. By default this is just `model.attributes`.

    view.populate({
      "last-name": "Beastridge"
      address: {
        street: "123 Chestnut"
      }
    });

`populate` triggers a `populate` event. If your view uses inputs with non standard names (or no names, multiple inputs with the same name, etc), use this event:

    this.on('populate', _.bind(function(attributes) {
      this.$('.my-input').val(attributes.custom);
    }, this));

To prevent child views from having their inputs populated use:

    view.populate(object, {
      children: false
    });

### validateInput *view.validateInput(attributes)*

Validate the attributes created by `serialize`, must return an array or nothing (if valid). It's recommended that the array contain hashes with `name` and `message` attributes, but arbitrary data or objects may be passed. If the array has a zero length the attributes are considered to be valid. Returning an array with any errors will trigger the `invalid` event.

    validateInput: function(attributes) {
      var errors = [];
      if (attributes.password && !attributes.password.match(/.{6,11}/)) {
        errors.push({name: 'password', message: 'Invalid Password'});
      }
      return errors;
    }









## APPENDIX APPENDIX APPENDIX APPENDIX have some visual reference that this is different, and organize it as such. not such big fonts and weights, much more reference-y


## Catalog of Built-in Thorax Events

### rendered *rendered ()*

Triggered on a view when the `rendered` method is called.

### child *child (instance)*

Triggered on a view every time a child view is appened into the view with the `view` helper.

### ready *ready (options)*

Triggered when a view is append to the DOM with `appendTo` or when a view is appeneded to a `LayoutView` via `setView`. Setting focus and other behaviors that depend on the view being present in the DOM should be handled in this event.

This event propagates to all children, including children that will be bound after the view is created. `options` will contain a `target` view, which is the view that triggered the event.

### activated *activated (options)*

Triggered on a view immediately after it was passed to a `LayoutView`'s `setView` method. Like `ready` this event propagates to children and the `options` hash will contain a `target` view.

### deactivated *deactivated (options)*

Triggered on a view when it was previously passed to the `setView` method on a `LayoutView`, and then another view is passed to `setView`. Triggered when the current view's `el` is still attached to the parent. Like `ready` this event propagates to children and the `options` hash will contain a `target` view.

### destroyed *destroyed ()*

Triggered on a view when the `release` method is called and the reference count is zero. Useful for implementing custom view cleanup behaviors. `release` will be also be called if it was previously passed to the `setView` method on a `LayoutView`, and then another view is passed to `setView`.

### change:view:start *change:view:start (newView [,oldView] ,options)*

Trigged on a `Thorax.LayoutView` immediately after `setView` is called.

### change:view:end *change:view:end (newView [,oldView] ,options)*

Trigged on a `Thorax.LayoutView` after `setView` is called, the old view has been destroyed (if present) and the new view has been attached to the DOM and had its `ready` event triggered.

### helper *helper (name [,args...] ,helperView)*

Triggered on a view when a view helper (such as `collection`, `empty`, etc) create a new `HelperView` instance.

### helper:name *helper:name ([,args...] ,helperView)*

Triggered on a view when a given view helper creates a new `HelperView` instance.

    {{#collection cats}}{{/collection}}

    view.on('helper:collection', function(collection, collectionView) {

    });

### serialize *serialize (attributes)*

Triggered on a view when `serialize` is called, before `validateInput` is called with the serialized attributes.

### validate *validate (attributes, errors)*

Triggered on a view when `serialize` is called, passed an an attributes hash and errors array after `validateInput` is called. Use in combination with the `invalid` event to display and clear errors from your views.

    Thorax.View.on({
      validate: function(attributes, errors) {
        //clear previous errors if present
      },
      invalid: function(errors) {
        errors.forEach(function(error) {
          //lookup input by error.name
          //display error from error.message
        });
      }
    });

### invalid *invalid (errors)*

Triggered on a view when `serialize` is called, if validateInput returned an array with any errors.

### populate *populate (attributes)*

Triggered on a view when `populate` is called. Passed a hash containing the attributes that the view will be populated with.

### rendered:collection *rendred:collection (collectionView, collection)*

Triggered on a `CollectionView` or a the view calling the `collection` helper every time `render` is called on the `CollectionView`.

### rendered:item *rendered:item (collectionView, collection, model, itemElement, index)*

Triggered on a `CollectionView` or a the view calling the `collection` helper every time an item is rendered in the `CollectionView`.

### rendered:empty *rendered:empty (collectionView, collection)*

Triggered on a `CollectionView` or a the view calling the `collection` helper every time the `emptyView` or `emptyTemplate` is rendered in the `CollectionView`.








## Event Enhancements

Thorax adds inheritable class events for all Thorax classes and significant enhancements to the Thorax.View event handling.

### Inheritable Events *ViewClass.on(eventName, callback)*

All Thorax classes have an `on` method to observe events on all instances of the class. Subclasses inherit their parents' event handlers. Accepts any arguments that can be passed to `viewInstance.on` or declared in the `events` hash.

    Thorax.View.on({
      'click a': function(event) {

      }
    });

### Model Events

When a model is bound to a view with `setModel` (automatically called by passing a `model` option when the view is instantiated) any events on the model can be observed by the view in this way. For instance to observe any model `change` event when it is bound to any view:

    Thorax.View.on({
      model: {
        change: function() {
          // "this" will refer to the view
        }
      }
    });

### Collection Events

When a collection is bound to a view with `setCollection` (automatically called by passing a `collection` option when the view is instantiated) any events on the collection can be observed by the view in this way. For instance to observe any collection `reset` event when it is bound to any view:

    Thorax.View.on({
      collection: {
        reset: function() {
          // "this" will refer to the view
        }
      }
    });

### View Events *view.events.viewEventName*

The `events` hash has been enhanced to allow view events to be registered along side DOM events:

    Thorax.View.extend({
      events: {
        'click a': function(event) {},
        rendered: function() {}
      }
    });

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

### _addEvent *view._addEvent(eventParams)*

This method is never called directly, but can be specified to override the behavior of the `events` hash or any event arguments passed to `on`. For each event declared in either manner `_addEvent` will be called with a hash containing:

- type "view" || "DOM"
- name (DOM events will begin with ".delegateEvents")
- originalName
- selector (DOM events only)
- handler

All of the behavior described in this section is implemented via this method, so if overriding make sure to call `Thorax.View.prototype._addEvent` in your child view.








## Thorax.Util

### tag *Thorax.Util.tag(name, htmlAttributes [,content] [,context])*

Generate an HTML string. All built in HTML generation uses this method. If `context` is passed any Handlebars references inside of the htmlAttributes values will rendered with the context. See the HTML attributes below? Look! You can make your own!

    Thorax.Util.tag("div", {
      id: "div-{{number}}"
    }, "content of the div", {
      number: 3
    });


## HTML Attributes

Thorax and its view helpers generate a number of custom HTML attributes that may be useful in debugging or generating CSS selectors to be used as arguments to `$` or to create CSS. The `*-cid` attributes are generally used only internally. See `$.model`, `$.collection` and `$.view` to get a reference to objects directly from the DOM. The `*-name` attributes will only be present if the given objects have a `name` property. 

<table class="table table-bordered table-striped">
  <thead>
    <tr>
      <th>Attribute Name</th>
      <th>Attached To</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>data-view-cid</code></td><td>Every view instances' <code>el</code></td></tr>
    <tr><td><code>data-view-name</code></td><td>Same as above, only present on named views</td></tr>
    <tr><td><code>data-collection-cid</code></td><td>Element generated by the `collection helper`</td></tr>
    <tr><td><code>data-collection-name</code></td><td>Same as above, only present when the bound collection is named</td></tr>
    <tr><td><code>data-collection-empty</code></td><td>Set to "true" or "false" depending on whether the bound collection <code>isEmpty</code></td></tr>
    <tr><td><code>data-collection-element</code></td><td>Set by the <code>collection-element</code>, determines where a collection in a <code>CollectionView</code> will be rendered.</td></tr>
    <tr><td><code>data-model-cid</code></td><td>A view's <code>el</code> if a model was bound to the view or each item element inside of elements generated by the collection helper</td></tr>
    <tr><td><code>data-model-name</code></td><td>Same as above, only present if the model is named</td></tr>
    <tr><td><code>data-layout-cid</code></td><td>The element generated by the <code>layout</code> helper or <code>el</code> inside of a <code>LayoutView</code> or <code>ViewController</code> instance</td></tr>
    <tr><td><code>data-view-helper</code></td><td>Elements generated by various helpers including <code>collection</code> and <code>empty</code> from the collection plugin</td></tr>
    <tr><td><code>data-call-method</code></td><td>Elements generated by the <code>link</code> and <code>button</code> helpers</td></tr>
    <tr><td><code>data-trigger-event</code></td><td>Elements generated by the <code>link</code> and <code>button</code> helpers</td></tr>
  </tbody>
</table>

When creating CSS selectors it's recommended to use the generated attributes (especially `data-view-name`) rather than assigning custom IDs or class names for the sole purpose of styling.

    [data-view-name="my-view-name"] {
      border: 1px solid #ddd;
    }

## Error Handling

### onException *Thorax.onException(name, error)*

Bound DOM event handlers in Thorax are wrapped with a try / catch block, calling this function if an error is caught. This hook is provided primarily to allow for easier debugging in Android environments where it is difficult to determine the source of the error. The default error handler is simply:

    Thorax.onException = function(name, error) {
      throw error;
    };

Override this function with your own logging / debugging handler. `name` will be the event name where the error was thrown.

