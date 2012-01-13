
## Overview

Opinionated Backbone, uses the following libraries:

- [Underscore](http://documentcloud.github.com/underscore/)
- [Backbone](http://documentcloud.github.com/backbone/)
- [Zepto](https://github.com/madrobby/zepto)
- [Handlebars](http://www.handlebarsjs.com/)
- [Stylus](http://learnboost.github.com/stylus/)
- [Lumbar](http://walmartlabs.github.com/lumbar)

### Quick Start

Thorax can be used standalone but is designed to work best with [Lumbar](http://walmartlabs.github.com/lumbar). The easiest way to setup a new Thoax + Lumbar project is with the thorax command line tool:

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

Append the view to the `Application.layout` object, displaying it on the page.

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

### load *model/collection.load(callback [,failback])*

Use this method when you need to display a blocking load indicator or can't set the next view until the requested data has loaded.

Calls `fetch` on the model or collection, triggering `load:start` and `load:end` on both the model / collection and the `Application` object. `callback` and `failback` will be used as arguments to `bindToRoute`.

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
- accepts a `collection or `model` hash of events that will be bound to the model or collection when `setModel` or `setCollection` are called, callbacks will be called with a context of the view instance

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

---

OLD DOCS

## Templates
Every View should have a *name* attribute, which should be the path to the view without the filename extension for example *checkout/shipping-options*. By default each view will render a corresponding template of the same name. Each rendered template will have a context with: 

- model *attributes* if a model was set with *setModel*
- view *attributes* hash or return value from *attributes* function, if no model is present
- attributes passed to the view constructor
- cid attribute (unique id for each rendered template)
- view partials registered with the *partials* hash or *partial* method

Calling *setCollection* on a view will bind events on collection *add*, *remove* and *reset*, updating the *_collectionElement* as appropriate. *_collectionElement* defaults to ".collection". A view with a collection requires the following templates:

- **name.handlebars**
- **name-item.handlebars** - must have exactly one outer element
- **name-empty.handlebars**

An *itemAttributes* method can be specified which recieves each model in the collection and must return the attributes which will be passed to *name-item.handlebars*. A simple implementation might look like:

    Phoenix.Views.Shelf = Phoenix.View.extend({
      name: 'shelf',
      itemAttributes: function(model) {
        return _.extend({
          key: 'value'
        }, model.attributes);
      }
    });

    //shelf.handlebars
    <h2>Shelf</h2>
    <ul class="collection"></ul>

    //shelf-item.handlebars
    <li>{{key}}</li>

    //shelf-empty.handlebars
    <li>There are no items in the shelf.</li>

### destroy *view.destroy()*
Destroy the card, calls *destroy* on any partials that were initialized. Custom cleanup behavior can be implemented by binding the *destroyed* event.

### render *view.render()*
By default calls this.html(this.renderTemplate(this.name + ".handlebars"))

### renderTemplate *view.renderTemplate(path_to_template [,attributes])*
Render a template with the given attributes, return the string output.

### html *view.html([content])*
Overwrites main element of the view. Views and Mixins (such as Scrollable) may change what the main element is. Returns the element which was updated allowing for chainable calls.

    this.html('<p></p>').addClass('name')


### setModel *view.setModel(model [,options])*
Set the *model* attribute of the view, triggering some customizable behaviors:

- **fetch** - auto fetch the model if empty, defaults to true
- **success** - a callback to call when fetch() succeeds, defaults to noop
- **render** - wether to call render after *setModel* and on the model's *change* event
- **populate** - wether to auto call *populate*, if there is no form in the view *populate* will have no effect
- **errors** - wether to bind error handlers, defaults to true
- **validate** - wether to call *validate* on the model in addition to the view when *serialize* is called
- **loading** - wether to trigger *load:start* and *load:end* events in the view if the model triggers them, defaults to true

### setCollection *view.setCollection(collection [,options])*
Set the *collection* attribute of the view. This will bind event handlers to call *_renderItem*, *_renderEmpty* as the collection changes, and by default will call fetch() on the collection. Options may contain:

- **fetch** - auto fetch, defaults to true
- **sucess** - a callback to call when fetch() succeeds, defaults to noop
- **errors** - wether to bind error handlers, defaults to true
- **loading** - wether to trigger *load:start* and *load:end* events in the view if the collection triggers them, defaults to true

### attributes *view.attributes()*
Override if needed. Called to extract attributes for *render*. Defaults to:

   return this.model ? this.model.attributes : this;

### itemAttributes *view.itemAttributes(model)*
Override if needed. Called to extract attributes for *_renderItem* from each item in a collection. Defaults to:

    returns model.attributes;

### \_renderItem *view.\_renderItem(model)*
Override if needed. Called for each item in a collection after *setCollection* is called. Must return a string, defaults to:

    return this.renderTemplate(this.name + '-item.handlebars',this.itemAttributes.call(this,item)); 

### \_renderEmpty *view.\_renderEmpty()*
Override if needed. Called when the collection is empty. Must return a string. Defaults to:
  
    return this.renderTemplate(this.name + '-empty.handlebars');

### \_collectionElement *view.\_collectionElement*
Override if needed. Element or String selector to select the collection element in the view, defaults to ".collection"

### \_loadingTimeoutDuration *view.\_loadingTimeoutDuration*
Amount of time before _loadingClassName is added to object.el after *load:start* occurs.

### \_loadingClassName *view.\_loadingClassName*
Defaults to "loading"

END OLD DOCS

---


## Templating

Intro, covering views with no model / collection, view with model, view with collection, view with both.

### name *view.name*

### registerHelper *App.View.registerHelper(name, callback)*

### template *view.template(name, [,scope])*

### view *view.view(name [,options])*

- example called from view
- example called from template, view handling inside templates

### html *view.html([content])*

### setModel *view.setModel(model)*

- model set event

### render *view.render()*

### context *view.context([model])*

- options

### setCollection *view.setCollection(collection)*

- collection set event

- options

### itemContext *view.itemContext(model, index)*

### renderCollection *view.renderCollection()*

### renderItem *view.renderItem()*

### renderEmpty *view.renderEmpty()*

### appendItem *view.appendItem(model [,index])*

### rendered

### rendered:collection

### rendered:item

### rendered:empty

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

- `validate` - with an attributes hash and errors array after `validateInput` is called
- `error` - with an errors array, if validateInput returned an array with any errors

### populate *view.populate([attributes])*

Populate the form fields in the view with the given attributes. The keys of the attributes should correspond to the names of the inputs. `populate` is automatically called with the response from `view.context(view.model)` when `setModel` is called.

    view.populate({
      "last-name": "Beastridge"
      address: {
        street: "123 Chestnut"
      }
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

