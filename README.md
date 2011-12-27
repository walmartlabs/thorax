
## Overview

Opinionated Backbone...

- [Underscore](http://documentcloud.github.com/underscore/)
- [Backbone](http://documentcloud.github.com/backbone/)
- [Zepto](https://github.com/madrobby/zepto)
- [Handlebars](http://www.handlebarsjs.com/)
- [Stylus](http://learnboost.github.com/stylus/)
- [Lumbar](http://walmartlabs.github.com/lumbar)

## Installation

    npm install -g thorax

## Command Line Interface

It is possible to use the main [thorax.js](https://github.com/walmartlabs/thorax/blob/master/generator/app/lib/thorax.js) library completely standalone, but all of the documentation will assume you will be using a project structure created by the command line interface.

### create *thorax create $project-name [$npm-module-name]*

Create a new thorax project. $npm-module-name may be an npm package name that contains a generator (just an index.js file exporting a function to run). The two handy generators you'll want to use are:

- thorax-web
- thorax-mobile

To generate a new project called "todos" you would run:

    thorax create todos thorax-web

This will create the following directory structure

- **app**
  - **collection.js**
  - **collections**
  - **init.js** - Application setup file
  - **lib** - jQuery / Zepto, Backbone, etc
  - **model.js**
  - **models**
  - **platform** - Platform specific files (i.e. Android only code)
  - **router.js**
  - **routers**
  - **styles**
  - **templates**
  - **view.js**
  - **views**
- **config**
- **generators** - Code generation templates used by the command line interface
- **lumbar.json** - See [Lumbar documentation](http://walmartlabs.github.com/lumbar)
- **Jakefile**
- **node_modules**
- **package.json**
- **public** - Static assets, Lumbar will generate it's output here
- **tasks** - Jake tasks
- **thorax.json** - Path information for the thorax command line interface

All other thorax commands are run from inside the project directory.

    cd todos

### install *thorax install $npm-module-name*

Install an npm module into your project, adding the module as a dependency in your package.json file. A simple express server module is available named *thorax-server*

    thorax install thorax-server

This makes available the *jake start* command which you can use to run a simple express server that is serving out your app.

### router *thorax router $module-name*

Generate a router class and a module of the same name. A module is defined in *lumbar.json* and is composed of models, collections, views, templates, styles and a single router. Lumbar combines these files into a single js and single css file which are lazily loaded when one of the module's route's is visited. Running:

    thorax router main

- creates: app/routers/main.js
- adds a JSON fragment for the *main* module in *lumbar.json*

You'll need to fill in the *routes* hash inside *lumbar.json* with path: method name pairs to match your router class. This is how Lumbar / Thorax work together to lazily load your modules.

### view *thorax view $module-name $view-name*

Generate a view class and template of the same name. Running:

    thorax view main header

- creates: app/views/header.js
- creates: app/templates/header.handlebars
- adds the appropriate JSON fragments in the *main* module in *lumbar.json*

### collection-view *thorax collection-view $module-name $view-name*

Generate a view class which will render a collection and the appropriate templates of the same name. Running:

    thorax collection-view main header

- creates: todo-list.js
- creates: app/templates/todo-list.handlebars
- creates: app/templates/todo-list-item.handlebars
- creates: app/templates/todo-list-empty.handlebars
- adds the appropriate JSON fragments in the *main* module in *lumbar.json*

### model *thorax model $module-name $model-name*

Generate a model class. Running:

    thorax model main todo

- creates: app/models/todo.js
- adds the appropriate JSON fragments in the *main* module in *lumbar.json*

### collection *thorax collection $module-name $collection-name*

Generate a collection class. Running:

    thorax collection main todo-list

- creates: app/collections/todo-list.js
- adds the appropriate JSON fragments in the *main* module in *lumbar.json*

### watch *jake watch*

Watches all files, generating the appropriate JavaScript or CSS in the *public* folder when changes occur.

    jake watch

### start *jake start*

Assuming you installed the *thorax-server* npm package this command will start a simple express server for the application you just created.

    jake start


---

## Thorax

### configure *Thorax.configure([options])*

- scope
- layout (element)

### throttleLoadStart *Thorax.throttleLoadStart(callback)*

### throttleLoadEnd *Thorax.throttleLoadEnd(callback)*

## Thorax.View Class

### create *App.View.create(name, protoProps [,classProps])*

### registerHelper *App.View.registerHelper(name, callback)*

### registerMixin *App.View.registerMixin(name, callback, methods)*

### registerEvents *App.View.registerEvents(events)*

### unregisterEvents *App.View.unregisterEvents([event])*

## Thorax.View Instance

### mixin *view.mixin(name)*

### view *view.view(name [,options])*

### template *view.template(name, [,scope])

### html *view.html([content])*

### setModel *view.setModel(model)*

### setCollection *view.setCollection(collection)*


### context *view.context([model])*

### itemContext *view.itemContext(model, index)*

### render *view.render()*

### renderCollection *view.renderCollection()*

### renderItem *view.renderItem()*

### renderEmpty *view.renderEmpty()*

### appendItem *view.appendItem(model [,index])*

### freeze *view.freeze([options])

- model
- collection

### serialize *view.serialize(callback)*

### populate *view.populate([attributes])*

### validateInput *view.validateInput()*

### destroy *view.destroy()*

### scrollTo *view.scrollTo(x ,y)

## Thorax.layout

### setView *Thorax.layout.setView

## Thorax.View Events

### initialize:before

### initialize:after

### rendered

### rendered:collection

### rendered:item

### rendered:empty

### validate

### error 

### destroyed

### activated

### deactivated

### ready

### load:start

### load:end



---

## Class Structure

- Backbone.View &rarr; Thorax.View &rarr; $app-name.View &rarr; $app-name.Views.$view-name
- Backbone.Router &rarr; Thorax.Router &rarr; $app-name.Router &rarr; $app-name.Routers.$router-name
- Backbone.Collection &rarr; Thorax.Collection &rarr; $app-name.Collection &rarr; $app-name.Collections.$collection-name
- Backbone.Model &rarr; Thorax.Model &rarr; $app-name.Model &rarr; $app-name.Models.$model-name

## Templates
Every View should have a *name* attribute, which should be the path to the view without the filename extension for example *checkout/shipping-options*. By default each view will render a corresponding template of the same name. Each rendered template will have a context with: 

- model *attributes* if a model was set with *setModel*
- view *attributes* hash or return value from *attributes* function, if no model is present
- attributes passed to the view constructor
- cid attribute (unique id for each rendered template)
- view partials registered with the *partials* hash or *partial* method

## Partials
TODO: improve

The *partial* method in a View will initialize another view.

    Phoenix.Views.Home = Phoenix.View.extend({
      name: 'home',
      initialize: function() {
        //initializes Phoenix.Views.Footer
        this.partial('Footer');
      },
      attributes: function() {
        return {
          key: 'value'
        };
      }
    });

    //home.handlebars
    <h1>Home</h1>
    <p>{{key}}</p>
    {{{Footer}}}

To insert a template as a string without initializing a view, use the *partial* template helper passing the path to a template file. No event handlers or logic from a related view will be applied.

    {{{partial "path/to/template"}}}

## I18N
All static text should be referenced using the i18n Handlebars helper.
This usage syntax is as follows **{{i18n keyName [plurality]}}**.  The i18n value can reference any parameters in the current Handlebars context and will be properly replaced.

- **keyName**: Key reference for the i18n value.  This can be the default language value as well.
- **plurality**: A static number or handlebars variable which represents a number.  This can be used to reference a different value for any given key.  The plural key is in the form of keyName[0|1|2|few|many] where few = 3-9 and many is 9 or greater.

The default language is specified in phoenix/js/data.js in the Phoenix.Data.I18N hash.  Some example values are:

    'foo': 'bar' // {{i18n "foo"}} -> bar
    'foo[1]': 'barSingular' // {{i18n "foo" 1}} -> barSingular
    'hello': 'hello {{name}}' // {{i18n "hello"}} -> hello Joe  (with the context being {name: "Joe"})

## Collections
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

## Models & Forms
TODO *setModel*

A basic form view might look like this:

    Phoenix.Views.AddressForm = Phoenix.View.extend({
      name: 'address-form',
      events: {
        'submit form': '_handleSubmit'
      },
      validate: function(attributes) {
        var errors = [];
        if (attributes.address.street === '') {
          errors.push({
            name: 'address[street]',
            message: 'message'
          });
        }
        if (errors.length) {
          return errors;
        }
      },
      _handleSubmit: function(event) {
        event.preventDefault();
        this.serialize(function(attributes) {
          console.log('form submission success');
        });
      }
    });

When using *populate* and *serialize* an input with a name of *address[street]* would correspond to the object *address.street*. All form inputs should have a corresponding label. Every template has a unique *cid* property which can be used to generate unique ids:
  
    //address-form.handlebars
    <label for="{{cid}}-name" class="error">Street</label>
    <input type="text" name="address[street]" id="{{cid}}-name" value="{{street}}"/>

Calling *serialize* calls *validate* on the view, and the view's model if one was set with *setModel*. Both *validate* methods must return an array in this format:

    [
      {
        name: 'input name', //optional
        message: 'error message'
      }
    ]

Assuming the form is empty, calling *serialize* would trigger an *error* event, and the view's built in error handler would make changes to the DOM resulting in:

    <label for="{{cid}}-name" class="error">Street <span>Message</span></label>
    <input type="text" name="address[street]" id="{{cid}}-name" value="{{street}}"/>

Errors that do not pertain to a particular field can be triggered by passing only a message. This will prepend the following HTML to the view:

    <ul class="error">
      <li>Message</li>
    </ul>

## Loading Events
TODO:

- model, collection
- manually triggering
- overriding Backbone.sync

Adds and removes *_loadingClassName* to *this.el* after *load:start* occurs and *_loadingTimeoutDuration* has elapsed. *load:start* and *load:end* can be triggered .

    this.trigger('load:start');
    setTimeout(_.bind(function() {
      this.trigger('load:end');
    }, this), 500);

## Phoenix.View

### name *view.name*
The path to the view without the filename extension, for example: *checkout/shipping-options*

### events *view.events*
A hash of events to bind. Phoenix.View extends Backbone.View's *delegateEvents* method to allow for view, model and collection events to be present in the hash in addition to DOM event handlers. Values may be a string method name, or a function callback, both of which will be called with the view as the context. The hash can contain:

- dom events, for example: "click a"
- view events (no space in event name)
- collection events in a hash, bound when *setCollection* is called
- model events in a hash, bound when *setModel* is called

An example hash might look like:

    events: {
      'a click': '_handleLinkClick',
      error: '_handleError',
      model: {
        change: '_handleModelChange'
      }
    }

To add an event to all views, extend the *Phoneix.View.events* hash which contains the built in event handlers.

_.extend(Phoneix.View.events, {
  'click a': function() {
    console.log('link clicked in ' + this.name);
  }
});

### mixin *view.mixin(mixin_name)*
Applies the logic in the mixin, adding the methods listed in each mixin. Built-in mixins are:

- [Scrollable](#scrollable)
- [Orientable](#orientable)

### partial *view.partial(view_class_name,[,attributes [,options]])*
Initializes a child view, making it available to any template rendered by parent view. Inside the template it will be inserted as. Calling *partial()* with the same view subsequent times will return the instance created on the first call.

    this.partial('Footer');

    //template.handlebars
    {{{Footer}}}

Note that the *el* node from the Footer view will be inserted into the template, not just the string HTML, so event handlers, etc from the child view will work correctly. Attributes to initialize the partial with may be passed as the second argument. Pass {render:false} as the third arguement to prevent the partially from automatically being rendered when it is initialized.

    this.partial('Footer',{key:'value'},{render: false});

You can also assign any view instance to a custom key name:

    this.partial('custom_key',new Phoenix.Views.Footer());
    
    //template.handlebars
    {{{custom_key}}}

### destroy *view.destroy()*
Destroy the card, calls *destroy* on any partials that were initialized. Custom cleanup behavior can be implemented by binding the *destroyed* event.

### render *view.render()*
By default calls this.html(this.renderTemplate(this.name + ".handlebars"))

### renderTemplate *view.renderTemplate(path_to_template [,attributes])*
Render a template with the given attributes, return the string output.

### html *view.html([content])*
Overwrites main element of the view. Views and Mixins (such as Scrollable) may change what the main element is. Returns the element which was updated allowing for chainable calls.

    this.html('<p></p>').addClass('name')

### serialize *view.serialize(callback [,options])*
Serializes the form on the page, invoking the callback with the serialized attributes. Will call *validate* and *model.validate* which in turn may trigger an *error* event. If an *error* event occurs the callback will not be invoked.

    this.serialize(function(attributes) {
      //  will only be called if there are no errors
      //  present after validate() is called
    });

Options may contain:

- set - if a *model* is present set the serialized attributes via *model.set*, defaults to true
- validate - wether or not to call *validate* and *model.valiate*, defaults to true
- focus - if validation fails, wether or not focus the first input with an error, defaults to true

### populate *view.populate([attributes])*
Populates a form in the view with *this.attributes()* or the passed attributes.

### validate *view.validate(attributes)*
Override in views requiring form validation. Should return nothing if form is valid, otherwise an array consisting of objects with *name* and *message* keys. *name* can be omitted if the error does not refer to a particular form field.

    validate: function(attributes) {
      var errors = [];
      if (attributes.email === '') {
        errors.push({
          name: 'email',
          message: 'Email cannot be blank.'
        });
      }
      if (errors.length) {
        return errors;
      }
    }

### \_checkFirstRadio *view.\_checkFirstRadio()*
Sets *checked="checked"* on the first radio input in the view.

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

### Catalog of Events
- **load:start** - triggered by model, collection, or manually
- **load:end** - triggered by model, collection, or manually
- **error** - triggered by *serialize* or by the bound *model* or *collection*
- **destroyed** - triggered when destroy is called, should be used to perform any needed cleanup

## Phoenix.layoutView

A singleton instance of Phoenix.Views.Layout which controls the flow between views.

### card *Phoenix.layoutView.card*
The current card view.

### setCard *Phoenix.layoutView.setCard(card_view [,options])*
Card may be a string name, or a Card view subclass instance. *options* may contain a "transition" key which sets the next transition mode:

    Phoenix.layoutView.setCard(new MyCardView(),{
      transition: 'slideUp'
    });

### setNextTransitionMode *Phoenix.layoutView.setNextTransitionMode(mode)*

### \_transition *Phoenix.layoutView.\_transition*
The string to be passed to *-webkit-transform*, defaults to *333ms ease-in-out*

### \_defaultTransitionMode *Phoenix.layoutView.\_defaultTransitionMode*
Defaults to *slideRight*

### Catalog of Events
- **load:start** - triggered by other controllers or views
- **load:end** - triggered by other controllers or views
- **change:card:start** (new_card, old_card, current_url) - triggered when *setCard* is called before transition animations start
- **change:card:end** (new_card, old_card, current_url) - triggered after *setCard* is called when new_card is ready and transition animations are complete

### Transitions
When calling *setCard* a transition will occur from the old card to the new. The type of transition can be explicitly set with Phoenix.layoutView.setNextTransitionMode() or by specifying a data-transition HTML attribute on a link, or by passing an object with a "transition" key as the second argument to *setCard*.

Transition mode may be any one of the following:

- **slideRight**
- **slideLeft**
- **slideUp**
- **slideDown**
- **none**

## Phoenix.Views.Card

Subclass of *Phoenix.View*, a base class representing a card / screen.

### initialize *card.initialize()*
Setup for the card view. Not called directly, but you must call *Phoenix.Views.Card.prototype.initialize* if overriding this method in subclasses.

    Phoenix.Views.MyCard = Phoenix.Views.Card.extend({
      name: 'my-card',
      initialize: function() {
        //custom logic
        Phoenix.Views.Card.prototype.initialize.call(this);
      }
    });

### Catalog of Events
- **activated** - called after card is attached to the DOM, before transition animation is complete
- **ready** - called after card is attached to DOM, and after transition animation is complete
- **deactivated** - called after card is removed from DOM, after transition animation is complete

## Orientable
Calls *render* on *orientationchange* when mixed in. Use *window.orientation* to determine current orientation in render.

## Scrollable
Make the content in your view scrollable.

### enableScrolling *object.enableScrolling()*
Automatically called when Scrollable is mixed in.

### disalbeScrolling *object.disableScrolling()*

### scrollTo *object.scrollTo(y [,duration])*

### detectScrollToBottom *object.detectScrollToBottom(callback)*
Detects when the user has scrolled to near the bottom of the view. *callback* recieves an function which must be invoked before *callback* will be invoked again.

    this.detectScrollToBottom(_.bind(function(next) {
      this.trigger('load:start');
      this.collection.loadMoreItems(_.bind(function() {
        this.trigger('load:end');
        next();
      }, this));
    }, this));

### \_detectScrollToBottomThreshold *Phoenix.ViewMixins.Scrollable.\_detectScrollToBottomThreshold*
In percent, defaults to 80.
