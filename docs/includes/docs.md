
## Overview

An opinionated Backbone application framework using:

- [Backbone](http://documentcloud.github.com/backbone/) - the core framework that Thorax builds on
- [Underscore](http://documentcloud.github.com/underscore/) - to make sure you have your JavaScript utility belt with you
- [Zepto](https://github.com/madrobby/zepto) - bitesize mobile DOM goodness
- [Handlebars](http://www.handlebarsjs.com/) - to make sure you have the best mustache for [movember](http://us.movember.com/)
- [Stylus](http://learnboost.github.com/stylus/) - for the cleanest CSS experience around
- [Lumbar](http://walmartlabs.github.com/lumbar) - our own library for seemless packaging so you are deploy-ready

### Quick Start

Thorax can be used [standalone (40kb)](https://github.com/walmartlabs/thorax/blob/master/thorax.js) but is designed to work best with [Lumbar](http://walmartlabs.github.com/lumbar). The easiest way to setup a new Thoax + Lumbar project is with the thorax command line tool or by [downloading the sample project](https://github.com/walmartlabs/thorax-example) it creates. To use the command line tools you'll need [node](http://nodejs.org/) (we recommend using [nvm](https://github.com/creationix/nvm) to install node) and [npm](http://npmjs.org/). If you are on a mac you'll need [Xcode](http://itunes.apple.com/us/app/xcode/id448457090?mt=12) installed to run gcc.

    npm install -g lumbar thorax
    thorax create project-name
    cd project-name
    lumbar build lumbar.json public
    bin/server 8000

This will create a hello world project, for a more complete example clone the [Thorax Todos](https://github.com/walmartlabs/thorax-todos) project. [Thorax Todos live demo](http://walmartlabs.github.com/thorax-todos/).

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

### Modules

In your `lumbar.json` file you can specify the modules that compose your application. Any files inside of the `base` module will always be present, while files specified in other modules will only be loaded when a route from that module has been visited. [See the Lumbar docs](http://walmartlabs.github.com/lumbar) for a detailed explanation.

Any configuration should be done inside of `js/init.js`. The `Application` object will not exist yet, you can reference it as `exports`.

### configure *Thorax.configure(options)*

Start Thorax and create the `Application.layout` object.

- `layout` - string css selector or Element where the `Application.layout` object will attach, defaults to `.layout`

## Routers & Layout

Thorax + Lumbar expects that you create one router of the same name as the module, per module. In the example project there is a `hello-world` module and a corresponding `js/routers/hello-world.js` file.

### create *Application.Router.create(module, protoProps [,classProps])*

Returns an `Application.Router` subclass. The module object will be automatically available inside the router file assuming it is part of a module.

    Application.Router.create(module, {
      index: function() {}
    });

Each router method should redirect to another router method or call `Application.layout.setView`

### view *router.view(name [,attributes])*

Create a new view instance, looking it up by the `name` property in the view's class definition.

### setView *Application.layout.setView(view)*

Append the view to the `Application.layout` object, displaying it on the page. This method is aliased to `Application.Router.prototype.setView` making it available as `this.setView` inside of router methods:

    routerMethod: function(id) {
      var view = this.view('view/name');
      view.bind('ready', function() {
        view.$('input:first')[0].focus();
      });
      this.setView(view);
    }

This will trigger two events on the `Application.layout` object, both of which will receive the new view and the old view (if present):

- `change:view:start` - immediately after `setView` call
- `change:view:end` - old view destroyed, new view in DOM and ready

### View Lifecycle Events

By calling `Application.layout.setView` on a given view various events will be triggered on that view.

- `initialize:before` - during constructor call, before *initialize* has been called
- `initialize:after` - during construcor call, after *initialize* has been called
- `activated` - immediately after *setView* was called with the view
- `ready` - *view.el* attached to parent
- `deactivated` - *setView* called with the next view, *view.el* still attached to parent
- `destroyed` - after the *view.el* has been removed from parent, immediately before *view.el* and child views are destroyed

## Loading Data

Various components in Thorax trigger two load events: `load:start` and `load:end`. They will be triggered in the following circumstances:

- on a model or collection when `sync` is called (via `fetch`, `save`, etc)
- on a view, when model or collection has been set on the view with `setModel` or `setCollection` and the model or collection triggers the event
- on the `Application` object when a module is loaded, or when `model/collection.load` is called

To implement both modal (blocking) and inline load indicators in your application:

    Application.bind('load:start', function() {
      //show modal loading indicator
    });
    Application.bind('load:end', function() {
      //hide modal loading indicator
    });

    Application.View.registerEvents({
      'load:start': function() {
        //show inline loading indicator
      },
      'load:end': function() {
        //hide inline loading indicator
      }
    });

### load *model/collection.load(callback [,failback [,options]])*

Use this method when you need to display a blocking load indicator or can't set the next view until the requested data has loaded.

Calls `fetch` on the model or collection, triggering `load:start` and `load:end` on both the model / collection and the `Application` object. `callback` and `failback` will be used as arguments to `bindToRoute`. `options` will be passed to the `fetch` call on the model or collection if present.

    routerMethod: function(id) {
      var view = this.view('view/name');
      var model = new Application.Model({id: id});
      //will trigger load:start on Application, model.fetch call
      model.load(_.bind(function() {
        //callback only called if browser still on this route
        //load:end triggered on Application
        view.setModel(model);
        this.setView(view);
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

### freeze *view.freeze([options])*

`setModel` and `setCollection` add event handlers to the view, call freeze to remove them. `options` may contain a `model` or `collection` key that should contain the model or collection that was set with `setModel` or `setCollection`.

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

Unregister events for all instances and subclasses of Application.View. Note that calling `unregisterEvents` on `Application.View` will unregister the built in events that make `setModel` and `setCollection` work. 

    Subclass.unregisterEvents(); //all events
    Application.View.unregisterEvents('click a');
    Application.View.unregisterEvents('model', 'change');

## Templating

Lumbar + Thorax uses [Handlebars](http://www.handlebarsjs.com) as the built in templating language.

### name *view.name*

Every view descending from Application.View must have a name attribute. `render` will look for a corresponding handlebars template of the same name.

    Application.View.extend({
      name: 'view-name'
      // templates/view-name.handlebars should exist
    });

`Application.Router` and `Application.View` instances both have a `view` method that will look up the view class by name and create new instance.

    var instance = this.view('view-name');

### registerHelper *Application.View.registerHelper(name, callback)*

Register a new helper that will be available in all handlebars templates

    Application.View.registerHelper('bold', function(content, options) {
      //options.hash contains key, value pairs from named / html arguments
      //to the helper
      return '<b>' + content + '</b>';
    });

    {{bold "Text"}}

### template *view.template(name [,attributes])*

Synchronously render a given template by file name sans extension. `render` and `renderCollection` both use this method. The scope inside of a template will contain all of the non function attributes of a view (which can be passed to the view constructor) and a `cid` attribute which is a unique id for each rendering of a given template.
    
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

### render *view.render()*

Render a template with the filename of the view's `name` attribute (sans extension), calling `view.html()` with the result. Triggers the `rendered` event.

### setModel *view.setModel(model)*

Set the *model* attribute of the view, triggering some customizable behaviors:

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

Set the *collection* attribute of the view. This will bind events on collection `add`, `remove` and `reset`, updating the collection element (specified by `_collectionSelector`) as needed. `options` may contain: 

- `fetch` - auto fetch, defaults to true, if an object is passed it will be used as the options to `fetch`
- `success` - a callback to call when fetch() succeeds, defaults to false
- `errors` - wether to bubble error events from the collection to the view, defaults to true

Collection rendering assumes that the following templates will be present.

- `templates/name.handlebars`
- `templates/name-item.handlebars` - must have exactly one outer element
- `templates/name-empty.handlebars`

You can use the `thorax collection-view $module-name $view-name` command to auto generate the view files, templates and lumbar.json entries.

The following events will be triggered when the collection is rendered:

- `rendered:collection` - called when `renderCollection` is called, receives the the collection element
- `rendered:item` - called for each item rendered in a non empty collection after `renderCollection` is called, receives the item element or view after it has been rendered
- `rendered:empty` - called when `renderCollection` is called with an empty collection, receives the the collection element

### _collectionSelector *view._collectionSelector*

A string specifying the CSS selector used to select the collection element. The collection element is not auto generated and must be present in your template. `_collectionSelector` defaults to `.collection`

    Application.View.extend({
      name: 'view-name',
      _collectionSelector: '.custom-collection'
    });

    // templates/view-name.handlebars
    <div class="custom-collection"></div>

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
      return this.template(this.name + '-item.handlebars', this.itemContext(model, i));
    }

### renderEmpty *view.renderEmpty()*

Override this method to specify what happens when `renderCollection` is called when the collection is empty. May return a string or another view. The default implementation is:
  
    renderEmpty: function() {
      return this.template(this.name + '-empty.handlebars');
    }

### appendItem *view.appendItem(item [,index])*

Append and item at a given index. If no index is passed the index of the model in the current collection will be used, if the first argument is not a model, 0 will be used. Item may be:

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

