
## Overview

An opinionated Backbone application framework providing a filesystem structure, on demand module loading, model and collection view binding, inheritable view and DOM events, data loading helpers, form serialization / population and validation. Built using [Backbone](http://documentcloud.github.com/backbone/), [Underscore](http://documentcloud.github.com/underscore/), [Zepto](https://github.com/madrobby/zepto), [Handlebars](http://www.handlebarsjs.com/), [Stylus](http://learnboost.github.com/stylus/) and [Lumbar](http://walmartlabs.github.com/lumbar).

### Quick Start

Thorax can be used [standalone](https://github.com/walmartlabs/thorax/blob/master/thorax.js) but is designed to work best with [Lumbar](http://walmartlabs.github.com/lumbar). The easiest way to setup a new Thoax + Lumbar project is with the thorax command line tool or by [downloading the sample project](https://github.com/walmartlabs/thorax-example) it creates. To use the command line tools you'll need [node](http://nodejs.org/) and [npm](http://npmjs.org/).

    npm install -g lumbar thorax
    thorax create project-name
    cd project-name
    lumbar build lumbar.json public
    bin/server 8000

This will create a hello world project, for a more complete example clone the [Thorax Todos](https://github.com/walmartlabs/thorax-todos) project ([demo](http://walmartlabs.github.com/thorax-todos/)).

### Project Structure

- `bin` - executable node scripts
- `generators` - code generation templates used by the [command line interface](#command)
- `js` - application code, models, collections, views, routers
- `lumbar.json` - [see Lumbar docs](http://walmartlabs.github.com/lumbar)
- `static` - static files / assets that will end up in the `public` folder
- `styles`
- `templates` 
- `thorax.json` - configuration for the [command line interface](#command)

## Configuration

### configure *Thorax.configure(options)*

Start Thorax and create the `Application.layout` object.

- `layout` - string css selector or Element where the `Application.layout` object will attach, defaults to `.layout`
- `scope` - object scope to configure, defaults to a new object in the global scope `Application`
- `templatePathPrefix` - Path where your templates are located. Defaults to "templates/"

## Routers & Layout

In your `lumbar.json` file you can specify the modules that compose your application. Each module is composed of routes, scripts, styles and templates. Thorax + Lumbar creates an internal router that listens to all routes in the application, lazily loading modules then calling a method on the router in that module as you would normally expect in a Backbone application.
### create *Application.Router.create(module, protoProps [,classProps])*

Generate an `Application.Router` subclass. The `module` object will be automatically available inside the router file. Thorax expects that you create one router of the same name as the module, per module. In the example project there is a `hello-world` module and a corresponding `js/routers/hello-world.js` file.

    Application.Router.create(module, {
      index: function() {}
    });

Each router method should redirect to another router method or call `Application.layout.setView`

### view *router.view(name [,attributes])*

Create a new view instance, looking it up by the `name` property in the view's class definition.

### layout *Application.layout*

Displays and manages views. By default there is only one layout object, `Application.layout` which is created then attached to the page when `Thorax.configure` is called. Additional layout objects having all of the same functionality as `Application.layout` can be created by calling `new Thorax.Layout()`.

### setView *Application.layout.setView(view)*

Append the view to the `Application.layout` object, displaying it on the page.

    routerMethod: function(id) {
      var view = this.view('view/name');
      view.bind('ready', function() {
        view.$('input:first')[0].focus();
      });
      Application.layout.setView(view);
    }

This will trigger two events on the `layout` object, both of which will receive the new view and the old view (if present):

- `change:view:start` - immediately after `setView` call
- `change:view:end` - old view destroyed, new view in DOM and ready

### View Lifecycle Events

By calling `setView` on a layout object various events will be triggered on the view passed and the previous view that was passed if any.

- `initialize:before` - during constructor call, before *initialize* has been called
- `initialize:after` - during construcor call, after *initialize* has been called
- `activated` - immediately after *setView* was called with the view
- `ready` - *view.el* attached to parent
- `deactivated` - *setView* called with the next view, *view.el* still attached to parent
- `destroyed` - after the *view.el* has been removed from parent, immediately before *view.el* and child views are destroyed

### anchorClick *Application.layout.anchorClick*

Layout objects listen for `click a` on all elements inside them (therefore inside any views passed to `setView`), triggering the corresponding route if one matches when clicked. Add a `data-external` attribute on links you want to be ignored by anchorClick.

    <a href="#/internal">Internal</a>
    <a href="/external" data-external="true">External</a>

## Loading Data

Thorax is primarily a view framework but provides `Thorax.Model` and `Thorax.Collection` classes which should be used when passed to `setModel` or `setCollection`. These are subclassed as `Application.Model` and `Application.Collection` in all of the example projects.

### load *model/collection.load(callback [,failback [,options]])*

Calls `fetch` on the model or collection ensuring the callbacks will only be called if the route does not change. `callback` and `failback` will be used as arguments to `bindToRoute`. `options` will be passed to the `fetch` call on the model or collection if present.

    routerMethod: function(id) {
      var view = this.view('view/name');
      var model = new Application.Model({id: id});
      model.load(_.bind(function() {
        //callback only called if browser still on this route
        view.setModel(model);
        Application.layout.setView(view);
      }, this), function() {
        //failback only called if browser has left this route
      });
    }

### bindToRoute *router.bindToRoute(callback [,failback])*

Used by `model/collection.load`. Binds the callback to the current route. If the browser navigtates to another route in the time between when the callback is bound and when it is executed, callback will not be called. Else failback will be called if present.

    routerMethod: function() {
      var callback = this.bindToRoute(function() {
        //callback called if browser is still on route
      });
      setTimeout(callback, 5000);
    }

## Events

Thorax adds to Backbone's event handling by enhancing the `view.events` hash, and providing a way of registering events for all views with `registerEvents` and `unregisterEvents`.

### events *Application.View.events*

Thorax enhances the `Backbone.View.events` hash handling in the following ways:

- accepts functions as a value to the hash in addition to a string method name
- accepts non DOM event names that will be treated as view events
- accepts a `collection` or `model` hash of events that will be bound to the model or collection when `setModel` or `setCollection` are called, callbacks will be called with a context of the view instance

An example of a view implementing all of the above:

    Application.View.extend({
      name: 'view-name',
      events: {
        custom: '_onCustom',
        'click a': '_onClick',
        model: {
          change: '_onChange'
        },
        collection: {
          add: function(model){}
        }
      },
      _onCustom: function(){},
      _onClick: function(event){},
      _onChange: function(){}
    });

### nested *nested eventName [selector]*

If a view has child views, the parent view by default will only listen for events triggered directly on the parent or DOM elements belonging directly to the parent, and not the children. The `nested` keyword can be used in the `events` hash or in a hash passed to `registerEvents` to listen for events triggered by the parents or it's children. 

    Application.View.extend({
      name: 'parent',
      events: {
        'nested eventName': function(view, arg) {
          //called with a context of parent, the triggering
          //view is always passed as the first argument followed
          //by any other arguments passed to trigger, if any
        },
        'nested click': function(event) {
          //always called with a context of parent
        }
      }
    });

### registerEvents *Application.View.registerEvents(events)*

Add events to all instances of a view. Accepts a hash in the same format as described in `Application.View.events`

    Application.View.registerEvents({
      'click a': function() {
        //called on any a click for all instances
        //and subclasses of Application.View
      }
    });

    Subclass = Application.View.extend({});
    Subclass.registerEvents({
      //events for all instances and subclasses of Subclass
    });

### unregisterEvents *Application.View.unregisterEvents([event])*

Unregister events for all instances and subclasses of a given view class. Note that calling `unregisterEvents` on `Application.View` will unregister the built in events that make `setModel` and `setCollection` work. 

    Subclass.unregisterEvents(); //all events
    Application.View.unregisterEvents('click a');
    Application.View.unregisterEvents('model', 'change');

### freeze *view.freeze([options])*

`setModel` and `setCollection` add event handlers to the view, call freeze to remove them. `options` may contain a `model` or `collection` key that should contain the model or collection that was set with `setModel` or `setCollection`.

### _addEvent *view._addEvent(params)*

This method is never called directly, but can be specified to override the behavior of the `events` hash or a hash passed to `registerEvents`. For each event passed `_addEvent` will be called with a hash containing:

- type "view" || "DOM"
- name (DOM events will begin with ".delegateEvents")
- originalName
- selector (DOM events only)
- handler
- nested (Boolean)

## Templating

Thorax provides deep integration with [Handlebars](http://www.handlebarsjs.com). By default one view maps to one Handlebars template of the same name. View attributes are made automatically availble to template as are model attributes if a model was set on a view with `setModel`. Views having a collection set via `setCollection` will look for corresponding `view-name-item.handlebars` and `view-name-empty.handlebars` templates. The `view` and `template` helpers are provided to allow the direct inclusion of other views or templates inside of templates.

### name *view.name*

Every view descending from Application.View must have a name attribute. `render` will look for a corresponding handlebars template of the same name.

    Application.View.extend({
      name: 'view-name'
      // templates/view-name.handlebars should exist
    });

`Application.Router` and `Application.View` instances both have a `view` method that will look up the view class by name and create new instance.

    var instance = this.view('view-name');

Each DOM element on the page containing a view will have the name set on the `data-view-name` attribute, allowing you to style your views with the following selector:
    
    [data-view-name="view-name"] {
      font-size: 2em;
    }

### registerHelper *Application.View.registerHelper(name, callback)*

Register a new helper that will be available in all handlebars templates. HTML generated from helpers should always be returned in a new `Handlebars.SafeString` object.

    Application.View.registerHelper('bold', function(content, options) {
      //options.hash contains key, value pairs from named / html arguments
      //to the helper
      return new Handlebars.SafeString('<b>' + content + '</b>');
    });

    {{bold "Text"}}

### template *view.template(name [,attributes])*

Render a given template by file name sans extension. `render` and `renderCollection` both use this method. The scope inside of a template will contain all of the non function attributes of a view (which can be passed to the view constructor) and a `cid` attribute which is a unique id for each rendering of a given template.
    
    var klass = Application.View.extend({
      name: 'view-name'
    });
    var view = new klass({
      title: 'The Title'
    });    
    console.log(view.template({
      body: 'The Body'
    }));

    // templates/view-name.handlebars
    <h1>{{title}}</h1>
    <p>{{body}}</p>

This method is also available as a template helper, it will only render the template as a string, if there is a corresponding view it will **not** be initialized. The scope of the current template will be carried inward to the rendred template. 
    
    {{template "header" key="value"}}
    <h1>{{title}}</h1>
    <p>{{body}}</p>
    {{template "footer"}}

### view *view.view(name [,attributes])*

Create a new view instance, looking it up by the `name` property in the view's class definition.
    
    Application.View.extend({
      name: 'header'
    });
    Application.View.extend({
      name: 'footer'
    });
    Application.View.extend({
      name: 'main',
      initialize: function() {
        this.header = this.view('header');
      }
    });

This method is also available as a template helper which can receive a string name of a view to initialize and append, or a reference to an already initialized view.

    // templates/main.handlebars
    {{view header}}
    <h1>{{title}}</h1>
    <p>{{body}}</p>
    {{view "footer"}}

### html *view.html([content])*

Replace the HTML in a given view. The collection element and the child views appended by the `{{view}}` helper will be automatically preserved if present.

### render *view.render([content])*

Render a template with the filename of the view's `name` attribute (sans extension), calling `view.html()` with the result. Triggers the `rendered` event.

To implement custom rendering behavior in a subclass override the method and pass a `content` argument to render which may be an HTML string, DOM Element or an array of DOM Elements.

    Application.View.extend({
      name: 'child',
      render: function() {
        return Application.View.prototype.render.call(this, 'content');
      }
    });

### setModel *view.setModel(model, options)*

Set the *model` attribute of the view. By default when the model is populated (either when it is passed to `setModel` or after it is fetched) the `render` will be called on the view, with the view's attributes and the model's `attributes` available inside of the template. A `change` event on the model (often triggered by the model's `set` method) will cause the view to call `render` again.

- `fetch` - auto fetch the model if empty, defaults to true, if an object is passed it will be used as the options to `fetch`
- `success` - a callback to call when fetch() succeeds, defaults to false
- `render` - wether to call render after *setModel* and on the model's *change* event, defaults to true
- `populate` - wether to auto call *populate*, defaults to true. if there is no form in the view *populate* will have no effect
- `errors` - wether to bubble the error event from the model to the view

`setModel` will trigger the `model set` event:

    Application.View.extend({
      name: 'view-name',
      events: {
        model: {
          set: function(model) {}
        }
      }
    });

### context *view.context([model])*

Specify this function to override what attributes will be passed from a model set with `setModel` to a template.

    Application.View.extend({
      name: 'view-name',
      context: function(model) {
        return _.extend({}, model.attributes, {
          title: model.getTitle()
        });
      }
    });

### setCollection *view.setCollection(collection [,options])*

Set the *collection* attribute of the view. This will bind events on collection `add`, `remove` and `reset`, updating the collection element (specified by the `collection` view helper) as needed. `options` may contain: 

- `fetch` - auto fetch, defaults to true, if an object is passed it will be used as the options to `fetch`
- `success` - a callback to call when fetch() succeeds, defaults to false
- `errors` - wether to bubble error events from the collection to the view, defaults to true

Collection rendering assumes that the following templates will be present.

- `templates/name.handlebars` - must contain the {{collection helper}}
- `templates/name-item.handlebars` - must have at least one outer HTML element
- `templates/name-empty.handlebars` - must have at least one outer HTML element

To display a collection in your template use the `{{collection}}` view helper. You can pass a custom `tag` name (defaults to "div") or any HTML attributes.

    {{collection tag="ul" class="my-list"}}

The following events will be triggered when the collection is rendered:

- `rendered:collection` - called when `renderCollection` is called, receives the the collection element
- `rendered:item` - called for each item rendered in a non empty collection after `renderCollection` is called, receives the item element or view after it has been rendered
- `rendered:empty` - called when `renderCollection` is called with an empty collection, receives the the collection element

### itemContext *view.itemContext(model, index)*

Just like the `context` method, but called for each item in the collection.

### renderCollection *view.renderCollection()*

Re-render the entire collection. If you need custom behavior when a collection is rendered it is better to use the `rendered` or `rendered:collection` events. This method looks for `this.collection` which should be set by `setCollection` and ignores any arguments passed.

### renderItem *view.renderItem(model, index)*

Override this method to specify how an item is rendered. May return a string or another view.

    renderItem: function(model) {
      return new MyItemView({
        model: model
      });
    }

    renderItem: function(model, i) {
      return this.template(this.name + '-item', this.itemContext(model, i));
    }

### renderEmpty *view.renderEmpty()*

Override this method to specify what happens when `renderCollection` is called when the collection is empty. May return a string or another view. The default implementation is:
  
    renderEmpty: function() {
      return this.template(this.name + '-empty');
    }

### emptyContext *view.emptyContext()*

Just like the `context` method, but called when `renderEmpty` is called.

### appendItem *view.appendItem(item [,index])*

Append and item at a given index. If no index is passed the index of the model in the current collection will be used, if the first argument is not a model, 0 will be used. `item` may be:

- a model which will be passed to `renderItem`
- an arbitrary html string which should contain exactly one outer element
- a view instance

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

### serialize *view.serialize([event], callback [,options])*

Serializes a form. `callback` will receive the attributes from the form and will only be called if `validateInput` returns nothing or an empty array. If an `event` is passed a check will be run to prevent duplicate submission. `options` may contain:

- `set` - defaults to true, wether or not to set the attributes if valid on a model if one was set with `setModel`
- `validate - defaults to true, wether or not to call `validateInput` during serialization

Each form input in your application should contain a corresponding label. Since you may want to re-use the same form multiple times in the same view a `cid` attribute with a unique value is provided to each render call of each template:
    
    <label for="{{cid}}-last-name"/>
    <input name="last-name" id="{{cid}}-last-name" value="Beastridge"/>
    <label for="{{cid}}-last-name"/>
    <input name="address[street]" value="123 Chestnut" id="{{cid}}-address[street]"/>

    Phoenix.View.extend({
      name: "address-form",
      events: {
        "submit form": "_handleSubmit"
      },
      _handleSubmit: function(event) {
        this.serialize(event, function(attributes) {
          attributes["last-name"] === "Beastridge";
          attributes.address.street === "123 Chestnut";
        });
      }
    });

`serialize` Triggers the following events:

- `serialize` - called before validation with serialized attributes
- `validate` - with an attributes hash and errors array after `validateInput` is called
- `error` - with an errors array, if validateInput returned an array with any errors

If your view uses inputs with non standard names (or no names, multiple inputs with the same name, etc), use the `serialize` event:

    this.bind('serialize', _.bind(function(attributes) {
      attributes.custom = this.$('.my-input').val();
    }, this));

### populate *view.populate([attributes])*

Populate the form fields in the view with the given attributes. The keys of the attributes should correspond to the names of the inputs. `populate` is automatically called with the response from `view.context(view.model.attributes)` when `setModel` is called.

    view.populate({
      "last-name": "Beastridge"
      address: {
        street: "123 Chestnut"
      }
    });

`populate` triggers a `populate` event. If your view uses inputs with non standard names (or no names, multiple inputs with the same name, etc), use this event:

    this.bind('populate', _.bind(function(attributes) {
      this.$('.my-input').val(attributes.custom);
    }, this));

### validateInput *view.validateInput(attributes)*

Validate the attributes created by `serialize`, must return an array or nothing (if valid). It's recommended that the array contain hashes with `name` and `message` attributes, but arbitrary data or objects may be passed. If the array has a zero length the attributes are considered to be valid. Returning an array with any errors will trigger the `error` event.

    validateInput: function(attributes) {
      var errors = [];
      if (attributes.password && !attributes.password.match(/.{6,11}/)) {
        errors.push({name: 'password', message: 'Invalid Password'});
      }
      return errors;
    }

## Mixins

### registerMixin *Application.View.registerMixin(name, callback, methods)*

Create a named mixin. Callback will be called with the context of the view instance calling `mixin`. `methods` will be added to the view instance.

    Application.View.registerMixin('mixin-name', function() {
      
    }, {
      methodName: function(){}
    });

    Application.View.extend({
      name: 'view-name',
      initialize: function() {
        this.mixin('mixin-name');
      }
    });

### mixin *view.mixin(name)*

Apply a given mixin by name. The mixin will only be applied once, thus duplicate calls `mixin` with the same `name` will not cause the mixin callback to be run multiple times.

## Command Line Interface

It is possible to use the main [thorax.js](https://github.com/walmartlabs/thorax/blob/master/thorax.js) library completely standalone, but all of the documentation will assume you will be using a project structure created by the command line interface. To install the command line tools run:

    npm install -g lumbar thorax

### create *thorax create $project-name*

Create a new thorax project. All other thorax commands are run from inside the project directory.
    
    thorax create todos
    cd todos

### router *thorax router $module-name*

Generate a router class and a module of the same name. A module is defined in *lumbar.json* and is composed of models, collections, views, templates, styles and a single router. Lumbar combines these files into a single js and single css file which are lazily loaded when one of the module's route's is visited. Running:

    thorax router todos

- creates: app/routers/todos.js
- adds a JSON fragment for the *todos* module in *lumbar.json*

You'll need to fill in the *routes* hash inside *lumbar.json* with path: method name pairs to match your router class. This is how Lumbar / Thorax work together to lazily load your modules.

### view *thorax view $module-name $view-name*

Generate a view class and template of the same name. Running:

    thorax view todos header

- creates: app/views/header.js
- creates: app/templates/header.handlebars
- adds the appropriate JSON fragments in the *main* module in *lumbar.json*

### collection-view *thorax collection-view $module-name $view-name*

Generate a view class which will render a collection and the appropriate templates of the same name. Running:

    thorax collection-view todos todo-list

- creates: todo-list.js
- creates: app/templates/todo-list.handlebars
- creates: app/templates/todo-list-item.handlebars
- creates: app/templates/todo-list-empty.handlebars
- adds the appropriate JSON fragments in the *main* module in *lumbar.json*

### model *thorax model $module-name $model-name*

Generate a model class. Running:

    thorax model todos todo

- creates: app/models/todo.js
- adds the appropriate JSON fragments in the *main* module in *lumbar.json*

### collection *thorax collection $module-name $collection-name*

Generate a collection class. Running:

    thorax collection todos todo-list

- creates: app/collections/todo-list.js
- adds the appropriate JSON fragments in the *main* module in *lumbar.json*

### watch *lumbar watch $lumbar-json-location $output-directory*

Watches all files, generating the appropriate JavaScript or CSS in the `output-directory` when changes occur.

    lumbar watch ./lumbar.json ./public

### build *lumbar build $lumbar-json-location $output-dir*

Just like watch, but runs once then exits.

    lumbar build ./lumbar.json ./public

### server *bin/server $port-number*

The example project includes a server script that will start an express server with a static provider for the `public` directory of your project.

    ./bin/server 8000

## Change Log

### 1.2

- load:start and load:end handling have been moved into a plugin
- nested event keyword now works with views, the callback will always be called with the context of the declaring view and will always recieve the triggering view as the first argument
- empty() the collection element before renderCollection()

### 1.1

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

