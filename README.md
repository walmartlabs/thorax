An opinionated, battle tested [Backbone](http://backbonejs.org/) + [Handlebars](http://handlebarsjs.com/) framework to build large scale web applications. 

**Thorax 2 is presently in beta, the [stable source](https://github.com/walmartlabs/thorax/tree/1.2) and [documentation](http://walmartlabs.github.com/thorax/stable) are still available.**

Thorax can be used standalone in any JavaScript environment in addition the [boilerplate projects](https://github.com/walmartlabs/thorax-boilerplate) provided above.

    var view = new Thorax.View({
      greeting: "Hello",
      template: "{{greeting}} world!"
    });
    view.appendTo('body');

## Registry

Thorax creates a special hash for each type of class to store all subclasses in your application. The use of `Thorax.Views` and `Thorax.templates` is required to allow the `view`, `template` and other helper methods to operate, but the use of `Thorax.Models` and `Thorax.Collections` are optional and provided for consitency.

<table cellpadding="0" cellspacing="0" border="0" width="100%">
  <thead>
    <tr>
      <th>Class</th>
      <th>Registry</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Thorax.View</td><td>Thorax.Views</td></tr>
    <tr><td>Thorax.Model</td><td>Thorax.Models</td></tr>
    <tr><td>Thorax.Collection</td><td>Thorax.Collections</td></tr>
    <tr><td>templates</td><td>Thorax.templates</td></tr>
  </tbody>
</table>

### name *klass.prototype.name*

If a `name` property is passed to any Thorax classes' `extend` method the resulting class will be automatically set in the corresponding registry.

    //set class
    Thorax.View.extend({
      name: "my-view"
    });

    //get class
    Thorax.Views["my-view"]

### templates *Thorax.templates*

A hash of templates, used by various Thorax helpers. If using the Lumbar or Rails boilerplate projects this hash will be automatically generated from the files in your `templates` directories. To manually add a template to the hash:

    Thorax.templates['my-template-name'] = Handlebars.compile('template string');

If a `View` has the same `name` as a template in the `templates` hash, it's `template' property will be automatically assigned.

<a class="tutorial" href="http://thoraxjs.org/tutorials/project-configuration">Project Configuration</a>

## Thorax.View

`Thorax.View` provides additive functionality over `Backbone.View` but breaks compatibility in one imporant way in that it does not use an `options` object. All properties passed to the constructor become available on the instance:

    var view = new Thorax.View({
      key: "value"
    });
    view.key === "value"

By default all instance properties are available in the template context. So when setting a key on the view it will by default be available in the template.

### template *view.template*

Assign a template to a view. This may be a string or a function which recieves a single `context` argument and returns a string. If the view has a `name` and a template of the same `name` is available the `template` will be auto-assigned.

    new Thorax.View({
      template: "{{key}}"
    });

### render *view.render([content])*

Renders the view's `template` updating the view's `el` with the result, triggering the `rendered` event.

    view.render();

`render` can also accept a content argument that may be an element, string or a template function:

    view.render('custom html');

### context *view.context()*

Used by `render` to determine what attributes are available in the view's `template`. The default context function returns `this` + `this.model.attributes` if a `model` is present on the view. The `context` method may be overriden to provide a custom context:

  new Thorax.View({
    template: '{{key}}',
    context: function() {
      return _.defaults(this.model.attributes, {
        key: 'value'
      });
    }
  });

<a href="http://thoraxjs.org/tutorials/controlling-context">Controlling Context</a>

### appendTo *view.appendTo(element)*

Appends the view to a given `element` which may be a CSS selector or DOM element. `ensureRendered` will be called and a `ready` event will be triggered. This is the preferred way to append your outer most view onto a page.

### renderTemplate *view.renderTemplate(name [,context])*

Renders a given template with the view's `context` or the given context argument.

### ensureRendered *view.ensureRendered()*

Ensure that the view has been rendered at least once.

### html *view.html([content])*

Get or set the `innerHTML` of the view, without triggering the `rendered` event.

### children *view.children*

A hash of child view's indexed by `cid`. Child views may become attached to the parent with the `view` helper or may be automatically attached `HelperView` instances created by helpers created with `regsterViewHelper` (such as the `collection` and `empty` helpers).

### parent *view.parent*

If a view was embedded inside another with the `view` helper, or a generated `HelperView` (for instance the `collection` or `empty` helpers) it will have a `parent` view attribute. In the case of `HelperView`s, the `parent` will be the view that declared the helper in it's template.

### destroy *view.destroy([options])*

Calls `remove` (and therefore `$el.remove` and `stopListening`) on your view, unbinds any model or collection bound with `setCollection` or `setModel`, calls `destroy` on all children, then triggers a `destroyed` event which can be used to implement specific cleanup behaviors in your views. Pass `children: false` to this method to prevent the view's children from being destroyed.

`destroy` will also be called on a view if it was previously passed to the `setView` method on a `LayoutView`, and then another view is passed to `setView`.

<a class="tutorial" href="http://thoraxjs.org/tutorials/view-lifecycle">View Lifecycle</a>

## Thorax.LayoutView

A view to contain a single other view which will change over time, (multi-pane single page applications for instance), triggering a series of events . By default this class has no template. If one is specified use the `layout` helper to determine where `setView` will place a view. A `Thorax.LayoutView` is a subclass of `Thorax.View` and may be treated as a view in every regard (i.e. embed multiple `LayoutView` instances in a parent view with the `view` helper).

### setView *view.setView(view [,options])*

Set the current view on the `LayoutView`, triggering `activated`, `ready` and `deactivated` events on the current and previous view during the lifecycle. `ensureRendered` is called on views passed to `setView`. By default `destroy` is called on the previous view when the new view is set. Pass `destroy: false` when setting a view to prevent it from being destroyed at a later time.

<a href="http://thoraxjs.org/tutorials/view-lifecycle" class="tutorial">View Lifecycle</a>

### getView *view.getView()*

Get the current view that was previously set with `setView`.

### layout *{{layout [htmlAttributes]}}*

By default `Thorax.LayoutView` classes have no template, just a placeholder to insert a view via `setView`. If a template to any of those classes is specified it must contain the a call to the layout helper where views will be placed. A custom `tag` or any HTML attributes may be specified.

## View Helpers

### template *{{template name [options]}}*

Embed a template inside of another, as a string. An associated view (if any) will not be initialized. By default the template will be called with the current context but extra options may be passed which will be added to the context.

    {{template "path/to/template" key="value"}}

If a block is used, the template will have a variable named `@yield` available that will contain the contents of the block.

    {{#template "child"}}
      content in the block will be available in a variable 
      named "@yield" inside the template "child"
    {{/template}}

This is useful when a child template will be called from multiple different parents.

<a class="tutorial" href="http://thoraxjs.org/tutorials/template-yield">Template Yield</a>

### super *{{super}}*

Embed the `template` from the parent view within the child template.

    {{super}}

### view *{{view name [options]}}*

Embed one view in another. The first argument may be the name of a new view to initialize or a reference to a view that has already been initialized.

    {{view "path/to/view" key="value"}}
    {{view viewInstance}}

If a block is specified it will be assigned as the `template` to the view instance:

    {{#view viewInstance}}
      viewInstance will have this block
      set as it's template property
    {{/view}}

### element *{{element name [options]}}*

Embed a DOM element in the view. This uses a placeholder technique to work, if the placeholder must be of a certain type in order to be valid (for instance a `tbody` inside of a `table`) specify a `tag` option.

    {{element domElement tag="tbody"}}

### button *{{#button methodName [htmlAttributes]}}*

Creates a `button` tag that will call the specified methodName on the view when clicked. Arbitrary HTML attributes can also be specified.

    {{#button "methodName" class="btn"}}Click Me{{/button}}

The tag name may also be specified:

    {{#button "methodName" tag="a" class="btn"}}A Link{{/button}}

A `trigger` attribute will trigger an event on the declaring view:

    {{#button trigger="eventName"}}Button{{/button}}

A button can have both a `trigger` attribute and a method to call:

    {{#button "methodName" trigger="eventName"}}Button{{/button}}

The method may also be specified as a `method` attribute:

    {{#button method="methodName"}}Button{{/button}}

### url *{{url urlString expand-tokens=bool}}*

Prepends "#" if `Backbone.history.pushSate` is disabled or prepends `Backbone.history.root` if it is enabled. If `expand-tokens=true` is passed, then any handlebars tokens will be resolved with the current context. For example if the context had an `id` attribute `{{id}}` would be replaced with the value of `id`:

    {{url "articles/{{id}}" expand-tokens=true}}

Multiple arguments can be passed and will be joined with a "/":

    {{url "articles" id}}

### link *{{#link url [htmlAttributes]}}*

Creates an `a` tag that will call `Backbone.history.navigate()` with the given url when clicked. Passes the `url` parameter to the `url` helper with the current context. Do not use this method for creating external links. Like the `url` helper, multiple arguments may be passed as well as an `expand-tokens` option.

    {{#link "articles/{{id}}" expand-tokens=true class="article-link"}}Link Text{{/link}}

To call a method from an `a` tag use the `button` helper:

    {{#button "methodName" tag="a"}}My Link{{/button}}

Like the `button` helper, a `trigger` attribute may be specified that will trigger an event on the delcaring view in addition to navigating to the specified url:

    {{#link "articles" id trigger="customEvent"}}Link Text{{/link}}

The href attribute is required but may also be specified as an attribute:

    {{#link href="articles/{{id}}" expand-tokens=true}}Link Test{{/link}}

## HelperView

### registerViewHelper *Handlebars.registerViewHelper(name [,viewClass] ,callback)*

Note that this differs from `Handlebars.registerHelper`. Registers a helper that will create and append a new `HelperView` instance, with it's `template` attribute set to the value of the captured block. `callback` will recieve any arguments passed to the helper followed by a `HelperView` instance. Named arguments to the helper will be present on `options` attribute of the `HelperView` instance.

A `HelperView` instance differs from a regular view instance in that it has a `parent` attribute which is always set to the declaring view, and a `context` which always returns the value of the `parent`'s context method. The `collection`, `empty` and other built in block view helpers are created with `registerViewHelper`.

A helper that re-rendered a `HelperView` every time an event was triggered on the declaring view could be implemented as:

    Handlebars.registerViewHelper('on', function(eventName, helperView) {
      helperView.listenTo(helperView.parent, eventName, function() {
        helperView.render();
      });
    });

An example use of this would be to have a counter that would incriment each time a button was clicked. In Handlebars:

    {{#on "incrimented"}}{{i}}{/on}}
    {{#button trigger="incrimented"}}Add{{/button}}

And the corresponding view class:

    new Thorax.View({
      events: {
        incrimented: function() {
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

<a href="http://thoraxjs.org/tutorials/helper-view" class="tutorial">HelperView</a>

## Event Enhancements

Thorax adds inheritable class events for all Thorax classes and significant enhancements to the Thorax.View event handling.

### Inheritable Events *ViewClass.on(eventName, callback)*

All Thorax classes have an `on` method to observe events on all instances of the class. Subclasses inherit their parents' event handlers. Accepts any arguments that can be passed to `viewInstance.on` or declared in the `events` hash.

    Thorax.View.on({
      'click a': function(event) {

      }
    });

### Model Events

When a model is bound to a view with `setModel` (automatically called by passing a `model` option in the constructor) any events on the model can be observed by the view in this way. For instance to observe any model `change` event when it is bound to any view:

    Thorax.View.on({
      model: {
        change: function() {
          // "this" will refer to the view
        }
      }
    });

### Collection Events

When a collection is bound to a view with `setCollection` (automatically called by passing a `collection` option in the constructor) any events on the collection can be observed by the view in this way. For instance to observe any collection `reset` event when it is bound to any view:

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

## Catalog of Built-in Events

### rendered *rendered ()*

Triggered on a view when the `rendered` method is called.

### child *child (instance)*

Triggered on a view every time a child view is appened into the view with the `view` helper.

### ready *ready (options)*

Triggered when a view is append to the DOM with `appendTo` or when a view is appeneded to a `LayoutView` via `setView`. Setting focus and other behaviors that depend on the view being present in the DOM should be handled in this event.

This event propagates to all children, including children that will be bound after the view is created. `options` will contain a `target` view, which is the view that triggered the event.

<a href="http://thoraxjs.org/tutorials/view-lifecycle" class="tutorial">View Lifecycle</a>

### activated *activated (options)*

Triggered on a view immediately after it was passed to a `LayoutView`'s `setView` method. Like `ready` this event propagates to children and the `options` hash will contain a `target` view.

<a href="http://thoraxjs.org/tutorials/view-lifecycle" class="tutorial">View Lifecycle</a>

### deactivated *deactivated (options)*

Triggered on a view when it was previously passed to the `setView` method on a `LayoutView`, and then another view is passed to `setView`. Triggered when the current view's `el` is still attached to the parent. Like `ready` this event propagates to children and the `options` hash will contain a `target` view.

<a href="http://thoraxjs.org/tutorials/view-lifecycle" class="tutorial">View Lifecycle</a>

### destroyed *destroyed ()*

Triggered on a view when the `destroy` method is called. Useful for implementing custom view cleanup behaviors. `destroy` will be also be called if it was previously passed to the `setView` method on a `LayoutView`, and then another view is passed to `setView`.

<a href="http://thoraxjs.org/tutorials/view-lifecycle" class="tutorial">View Lifecycle</a>

### change:view:start *change:view:start (newView [,oldView] ,options)*

Trigged on a `Thorax.LayoutView` immediately after `setView` is called.

<a href="http://thoraxjs.org/tutorials/view-lifecycle" class="tutorial">View Lifecycle</a>

### change:view:end *change:view:end (newView [,oldView] ,options)*

Trigged on a `Thorax.LayoutView` after `setView` is called, the old view has been destroyed (if present) and the new view has been attached to the DOM and had it's `ready` event triggered.

<a href="http://thoraxjs.org/tutorials/view-lifecycle" class="tutorial">View Lifecycle</a>

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

Triggered on a view when `serialize` is called, passed an an attributes hash and errors array after `validateInput` is called.

### error *error (errors)*

Triggered on a view when `serialize` is called, if validateInput returned an array with any errors.

### populate *populate (attributes)*

Triggered on a view when `populate` is called. Passed a hash containing the attributes that the view will be populated with.

## Form Handling

Thorax provides helpers to assist with form handling, but makes no user interface decisions for you. Use the `validate` and `error` events to implement error messages in your application.

    Application.View.registerEvents({
      validate: function(attributes, errors) {
        //clear previous errors if present
      },
      error: function(errors) {
        errors.forEach(function(error) {
          //lookup input by error.name
          //display error from error.message
        });
      }
    });

<a href="http://thoraxjs.org/tutorials/form-handling" class="tutorial">Form Handling</a>

### serialize *view.serialize([event], callback [,options])*

Serializes a form. `callback` will receive the attributes from the form, followed by a `release` method which must be called before the form can be submitted again. `callback` will only be called if `validateInput` returns nothing or an empty array. `options` may contain:

- `set` - defaults to true, wether or not to set the attributes if valid on a model if one was set with `setModel`
- `validate - defaults to true, wether or not to call `validateInput` during serialization
- `children` - defaults to true, wether or not to serialize inputs in child views
- `silent` - defaults to true, wether or not to pass `silent: true` to `model.set`

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

Validate the attributes created by `serialize`, must return an array or nothing (if valid). It's recommended that the array contain hashes with `name` and `message` attributes, but arbitrary data or objects may be passed. If the array has a zero length the attributes are considered to be valid. Returning an array with any errors will trigger the `error` event.

    validateInput: function(attributes) {
      var errors = [];
      if (attributes.password && !attributes.password.match(/.{6,11}/)) {
        errors.push({name: 'password', message: 'Invalid Password'});
      }
      return errors;
    }

<a href="http://thoraxjs.org/tutorials/data-validation" class="tutorial">Data Validation</a>

## Util

### tag *Thorax.Util.tag(name, htmlAttributes [,content] [,expand-tokens])*

Generate an HTML string. All built in HTML generation uses this method. If `context` is passed any Handlebars references inside of the htmlAttributes values will rendered with the context.

    Thorax.Util.tag("div", {
      id: "div-{{number}}"
    }, "content of the div", {
      number: 3
    });

## $

### $.view *$(event.target).view([options])*

Get a reference to the nearest parent view. Pass `helper: false` to options to exclude `HelperView`s from the lookup. Useful when registering DOM event handlers:

    $(event.target).view();

### $.model *$(event.target).model([view])*

Get a reference to the nearest bound model. Can be used with any `$` object but most useful in event handlers.

    $(event.target).model();

A `view` may be optionally passed to limit the lookup to a specific view.

### $.collection *$(event.target).collection([view])*

Get a reference to the nearest bound collection. Can be used with any `$` object but most useful in event handlers.

    $(event.target).collection();

A `view` may be optionally passed to limit the lookup to a specific view.

## HTML Attributes

Thorax and it's view helpers generate a number of custom HTML attributes that may be useful in debugging or generating CSS selectors to be used as arguments to `$` or to create CSS. The `*-cid` attributes are generally used only internally. See `$.model`, `$.collection` and `$.view` to get a reference to objects directly from the DOM. The `*-name` attributes will only be present if the given objects have a `name` property.</p>

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
    <tr><td><code>data-collection-empty</code></td><td>Set to "true" or "false" depending on wether the bound collection <code>isEmpty</code></td></tr>
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
      border: 1px solid #ccc;
    }

## Error Handling

### onException *Thorax.onException(name, error)*

Bound DOM event handlers in Thorax are wrapped with a try / catch block, calling this function if an error is caught. This hook is provided primarily to allow for easier debugging in Android environments where it is difficult to determine the source of the error. The default error handler is simply:
  
    Thorax.onException = function(name, error) {
      throw error;
    };

Override this function with your own logging / debugging handler. `name` will be the event name where the error was thrown.

## Command Line

To use the command line utilities:

    npm install -g thorax

### templates *thorax templates ./templates ./templates.js*

If using Thorax outside of the provided node or Rails downloads you can inline a directory of templates into a single file by running the `thorax templates` command.

    npm install -g thorax
    thorax templates ./templates-dir ./templates.js

<a href="http://thoraxjs.org/tutorials/project-configuration" class="tutorial">Project Configuration</a>