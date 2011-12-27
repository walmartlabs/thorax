
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

## Layout

## Module Loading

## Load Events

- bindToRoute
- load method

## Templating

- model
- collection
- context
- registerHelper

## Events

- registerEvents
- model / collection events

## Form Handling



## Thorax

### configure *Thorax.configure([options])*

- scope
- layout (element)

### throttleLoadStart *Thorax.throttleLoadStart(callback)*

### throttleLoadEnd *Thorax.throttleLoadEnd(callback)*




## Thorax.View 

Subclass of [Backbone.View](http://documentcloud.github.com/backbone/#View)

### create *App.View.create(name, protoProps [,classProps])*

### registerHelper *App.View.registerHelper(name, callback)*

### registerMixin *App.View.registerMixin(name, callback, methods)*

### registerEvents *App.View.registerEvents(events)*

### unregisterEvents *App.View.unregisterEvents([event])*

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

Subclass of [Backbone.View](http://documentcloud.github.com/backbone/#View)

### setView *Thorax.layout.setView

## Thorax.Model

Subclass of [Backbone.Model](http://documentcloud.github.com/backbone/#Model)

### create *Thorax.Collection.create(name, protoProps [,classProps])*
### load *collection.load(callback [,failback])*

## Thorax.Collection

Subclass of [Backbone.Collection](http://documentcloud.github.com/backbone/#Collection)

### create *Thorax.Collection.create(name, protoProps [,classProps])*
### load *collection.load(callback [,failback])*

## Thorax.Router

Subclass of [Backbone.Router](http://documentcloud.github.com/backbone/#Router)

### create *Thorax.Router.create(name, protoProps [,classProps])*
### view *router.view(name [,attributes])*
### bindToRoute *router.bindToRoute(callback [,failback])*

## Events

### initialize:before *Thorax.View*

### initialize:after *Thorax.View*

### rendered *Thorax.View*

### rendered:collection *Thorax.View*

### rendered:item *Thorax.View*

### rendered:empty *Thorax.View*

### validate *Thorax.View*

### error *Thorax.View*

### destroyed *Thorax.View*

### activated *Thorax.View*

### deactivated *Thorax.View*

### ready *Thorax.View*

### load:start *scope, Thorax.View*

### load:end *scope, Thorax.View*

