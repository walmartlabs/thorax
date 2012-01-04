
## Overview

Opinionated Backbone, uses the following libraries:

- [Underscore](http://documentcloud.github.com/underscore/)
- [Backbone](http://documentcloud.github.com/backbone/)
- [Zepto](https://github.com/madrobby/zepto)
- [Handlebars](http://www.handlebarsjs.com/)
- [Stylus](http://learnboost.github.com/stylus/)
- [Lumbar](http://walmartlabs.github.com/lumbar)

### Quick Start

Thorax can be used standalone but is designed to work best with [Lumbar](http://walmartlabs.github.com/lumbar). The easiest way to setup a new Thoax + Lumbar project is with the the [Thorax command line library](http://walmartlabs.github.com/thorax-cli):

    npm install -g thorax-cli
    thorax create project-name

This will create a blank project. If you'd like to play with something that is already functional install the [Thorax Todos](http://walmartlabs.github.com/thorax-todos) application:

    cd project-name
    thorax install thorax-todos
    jake init
    jake start

## Configuration

### configure *Thorax.configure(options)*

- layout property
- scope property, what gets set on scope property

## Routers & Layout

### Modules

base and other modules, how are they created

### create *Thorax.Router.create(module, protoProps [,classProps])*
### view *router.view(name)*
### setView *Application.layout.setView(view)*

### View Lifecycle Events

- initialize:before
- initialize:after
- activated
- ready
- deactivated
- destroyed

## Loading Data

### load:start *event*
### load:end *event*

- model / collection load event triggers
- module loading event triggers

### load *model/collection.load(callback [,failback])*
### bindToRoute *router.bindToRoute(callback [,failback])*

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

## Event 

### events *App.View.events*

- dom events
- view events
- model events
- collection events

### registerEvents *App.View.registerEvents(events)*

### unregisterEvents *App.View.unregisterEvents([event])*

### freeze *view.freeze([options])*

- model
- collection

## Mixins

### registerMixin *App.View.registerMixin(name, callback, methods)*

### mixin *view.mixin(name)*

## Form Handling

### serialize *view.serialize(callback)*

### populate *view.populate([attributes])*

### validateInput *view.validateInput()*

### validate

### error

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

