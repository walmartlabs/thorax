
## Overview

Opinionated Backbone, uses the following libraries:

- [Underscore](http://documentcloud.github.com/underscore/)
- [Backbone](http://documentcloud.github.com/backbone/)
- [Zepto](https://github.com/madrobby/zepto)
- [Handlebars](http://www.handlebarsjs.com/)
- [Stylus](http://learnboost.github.com/stylus/)
- [Lumbar](http://walmartlabs.github.com/lumbar)

## Quick Start

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

### template *view.template(name, [,scope])

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

## Events

### events *App.View.events*

- dom events
- view events
- model events
- collection events

### registerEvents *App.View.registerEvents(events)*

### unregisterEvents *App.View.unregisterEvents([event])*

### freeze *view.freeze([options])

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
