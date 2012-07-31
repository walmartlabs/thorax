Thorax
======

## Thorax

### template *Thorax.template(name [,content])*

### view *Thorax.view(name [,protoProps])*

## Thorax.View

### name *view.name*

### children *view.children*

### parent *view.parent*

### destroy *view.destroy([options])*

### template *view.template*

### render *view.render([content])*

### context *view.context*

### renderTemplate *view.renderTemplate(filename, context [,ignoreErrors])*

### ensureRendered *view.ensureRendered()*

### html *view.html([content])*

## View Helpers

### super *{{super}}*

### template *{{template name [options]}}*

### view *{{view name [options]}}*

### element *{{element name [options]}}*

### registerViewHelper *Handlebars.registerViewHelper(name [,viewClass] ,callback)

## Util

### tag *Thorax.Util.tag(name, attributes [,content] [,scope])*

## Extras

### view *$(event.target).view([options])*

## Events

### destroyed *destroyed ()*

### rendered *rendered ()*

### child *child (instance)*

### helper *helper (name, \*args, helperView)*

### helper:name *helper:name (\*args, helperView)*

## HTML Attributes

* data-view-cid
* data-view-name
* data-helper-name
* data-collection-cid
* data-collection-name
* data-collection-empty
* data-model-cid
* data-model-name
* data-layout-cid
* data-call-method